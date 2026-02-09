import { FileData } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

export const parseRepoUrl = (url: string): { owner: string; repo: string } | null => {
  try {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    const urlObj = new URL(cleanUrl);
    if (urlObj.hostname !== 'github.com' && urlObj.hostname !== 'www.github.com') return null;
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) return { owner: pathParts[0], repo: pathParts[1] };
    return null;
  } catch (e) {
    return null;
  }
};

interface GithubContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  url: string; // API url
  size?: number;
}

// Fetch a single directory level
const fetchDirectory = async (owner: string, repo: string, path: string, token?: string): Promise<GithubContentItem[]> => {
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const url = path 
    ? `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`
    : `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents`;

  try {
    // 3s timeout for directory listings
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 404) return []; // Directory doesn't exist, just return empty
      if (res.status === 403 || res.status === 429) throw new Error("RATE_LIMIT");
      throw new Error(`GitHub API ${res.status}`);
    }

    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        url: item.url,
        size: item.size
      }));
    }
    return [];
  } catch (e: any) {
    if (e.message === 'RATE_LIMIT') throw e;
    console.warn(`Failed to fetch dir: ${path}`, e);
    return [];
  }
};

const selectImportantFiles = (items: GithubContentItem[]): GithubContentItem[] => {
  const IMPORTANT_NAMES = [
    'package.json', 'go.mod', 'cargo.toml', 'requirements.txt', 'pom.xml', 'build.gradle',
    'dockerfile', 'docker-compose.yml', 'next.config.js', 'tsconfig.json', 'vite.config.ts',
    'readme.md'
  ];

  // 1. Priority Configs (Limit 3)
  const configs = items.filter(i => 
    i.type === 'file' && IMPORTANT_NAMES.includes(i.name.toLowerCase())
  ).slice(0, 3);

  // 2. Code Entry Points (Limit 4)
  // Look for index.js, main.go, App.tsx in the list
  const codeFiles = items.filter(i => {
    if (i.type !== 'file') return false;
    const lower = i.name.toLowerCase();
    // Exclude configs we already checked
    if (IMPORTANT_NAMES.includes(lower)) return false;
    
    return /\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp)$/.test(lower) && 
           !lower.includes('.test.') && 
           !lower.includes('.spec.');
  }).slice(0, 4);

  // Deduplicate by path
  const combined = [...configs, ...codeFiles];
  const unique = new Map();
  combined.forEach(item => unique.set(item.path, item));
  
  return Array.from(unique.values()).slice(0, 7); // Hard cap at 7 files
};

const fetchFileContents = async (owner: string, repo: string, files: GithubContentItem[], token?: string): Promise<FileData[]> => {
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  const promises = files.map(async (file) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s max per file

    try {
      // Use the API URL provided in the directory listing to get content
      const res = await fetch(file.url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) return null;
      const data = await res.json();

      // GitHub API returns 'content' in base64
      if (data.content && data.encoding === 'base64') {
        // Remove newlines from base64 string before decoding
        const cleanBase64 = data.content.replace(/\n/g, '');
        const decodedContent = atob(cleanBase64);
        return { path: file.path, content: decodedContent };
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter((f): f is FileData => f !== null);
};

export const getRepoContext = async (owner: string, repo: string, token?: string): Promise<{ fileTree: string[], files: FileData[], isFallback: boolean }> => {
  try {
    // 1. Fetch Root files (Fast)
    const rootItems = await fetchDirectory(owner, repo, '', token);
    
    // 2. Identify likely source folders
    const sourceFolder = rootItems.find(i => 
      i.type === 'dir' && ['src', 'app', 'lib', 'pkg'].includes(i.name.toLowerCase())
    );

    // 3. Fetch Source folder if exists (Parallel with processing root)
    let sourceItems: GithubContentItem[] = [];
    if (sourceFolder) {
      sourceItems = await fetchDirectory(owner, repo, sourceFolder.path, token);
    }

    // Combine lists
    const allItems = [...rootItems, ...sourceItems];

    // Generate simplified tree for AI context (just the paths we found)
    const fileTree = allItems.map(i => i.path);

    // Select critical files for content fetching
    const filesToFetch = selectImportantFiles(allItems);
    const fileContents = await fetchFileContents(owner, repo, filesToFetch, token);

    return {
      fileTree,
      files: fileContents,
      isFallback: false
    };

  } catch (error: any) {
    if (error.message === 'RATE_LIMIT') {
      return { fileTree: [], files: [], isFallback: true };
    }
    // If root fetch fails completely (e.g. 404), bubble up
    throw error;
  }
};