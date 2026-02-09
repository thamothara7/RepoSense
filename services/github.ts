import { FileData } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

// Helper to extract owner and repo from URL
export const parseRepoUrl = (url: string): { owner: string; repo: string } | null => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      return { owner: pathParts[0], repo: pathParts[1] };
    }
    return null;
  } catch (e) {
    return null;
  }
};

interface TreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

// Fetch the file tree
const fetchRepoTree = async (owner: string, repo: string): Promise<TreeItem[]> => {
  // 1. Get default branch
  const repoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`);
  
  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" not found. It might be private or does not exist.`);
    }
    if (repoRes.status === 403 || repoRes.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    throw new Error(`GitHub API Error: ${repoRes.status} ${repoRes.statusText}`);
  }

  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch;

  // 2. Get Tree (recursive)
  const treeRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
  
  if (!treeRes.ok) {
    if (treeRes.status === 404) {
      throw new Error(`Could not access file tree for branch "${defaultBranch}".`);
    }
    if (treeRes.status === 403 || treeRes.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    throw new Error(`Failed to fetch repo tree. (${treeRes.status})`);
  }

  const treeData = await treeRes.json();
  
  if (treeData.truncated) {
    console.warn("Repository tree is too large and was truncated by GitHub API.");
  }

  return treeData.tree;
};

// Heuristic to select important files for context
const selectImportantFiles = (tree: TreeItem[]): TreeItem[] => {
  const IMPORTANT_FILES = [
    'README.md', 'readme.md',
    'package.json', 'tsconfig.json', 'go.mod', 'Cargo.toml', 'requirements.txt', 'pom.xml',
    'docker-compose.yml', 'Dockerfile',
    'src/index.ts', 'src/index.js', 'src/main.rs', 'main.go', 'src/App.tsx', 'src/App.js'
  ];

  // 1. Configs and Readmes (High priority)
  const highPriority = tree.filter(item => 
    IMPORTANT_FILES.includes(item.path) || 
    item.path.endsWith('.md') || 
    item.path.endsWith('.json')
  ).slice(0, 5);

  // 2. Source code files (Medium priority) - limit depth
  const sourceFiles = tree.filter(item => {
    const isCode = /\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h)$/.test(item.path);
    const isTopLevel = item.path.split('/').length <= 3;
    return isCode && isTopLevel && !item.path.includes('test') && !item.path.includes('.d.ts');
  }).slice(0, 10);

  // Combine and deduplicate
  const combined = [...highPriority, ...sourceFiles];
  return Array.from(new Set(combined));
};

// Fetch content of specific files
const fetchFileContents = async (owner: string, repo: string, files: TreeItem[]): Promise<FileData[]> => {
  const promises = files.map(async (file) => {
    try {
      const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${file.path}`);
      if (!res.ok) return null;
      const data = await res.json();
      // GitHub API returns content in base64
      if (data.content && data.encoding === 'base64') {
        const decodedContent = atob(data.content.replace(/\n/g, ''));
        return { path: file.path, content: decodedContent };
      }
      return null;
    } catch (e) {
      console.warn(`Failed to fetch content for ${file.path}`, e);
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter((f): f is FileData => f !== null);
};

export const getRepoContext = async (owner: string, repo: string): Promise<{ fileTree: string[], files: FileData[], isFallback: boolean }> => {
  try {
    const tree = await fetchRepoTree(owner, repo);
    
    // Get a simplified list of paths for the AI to understand structure
    // Limit to top 200 files to avoid token overflow in prompt if repo is massive
    const fileTreePaths = tree
      .filter(t => t.type === 'blob')
      .map(t => t.path)
      .slice(0, 300);

    const selectedFiles = selectImportantFiles(tree);
    const fileContents = await fetchFileContents(owner, repo, selectedFiles);

    return {
      fileTree: fileTreePaths,
      files: fileContents,
      isFallback: false
    };
  } catch (error: any) {
    if (error.message === 'RATE_LIMIT') {
      console.warn("GitHub rate limit reached. Returning fallback context.");
      return {
        fileTree: [],
        files: [],
        isFallback: true
      };
    }
    throw error;
  }
};