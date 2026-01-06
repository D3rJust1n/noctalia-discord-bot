const githubToken = process.env.GITHUB_TOKEN;

function getAuthHeaders() {
    const headers = {
        'Accept': 'application/vnd.github+json',
    };
    if (githubToken) {
        headers['Authorization'] = `Bearer ${githubToken}`;
    }
    return headers;
}

/**
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object|null>} Release data or null on error
 */
async function getLatestRelease(owner, repo) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
            headers: getAuthHeaders(),
        });
        
        if (!response.ok) {
            console.error(`Failed to fetch latest release: ${response.status} ${response.statusText}`);
            return null;
        }
        
        const data = await response.json();
        return {
            tag: data.tag_name,
            name: data.name || data.tag_name,
            publishedAt: data.published_at,
        };
    } catch (error) {
        console.error('Error fetching latest release:', error);
        return null;
    }
}

/**
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name (default: 'main')
 * @returns {Promise<Object|null>} Commit data or null on error
 */
async function getLatestCommit(owner, repo, branch = 'main') {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${branch}`, {
            headers: getAuthHeaders(),
        });
        
        if (!response.ok) {
            // Try 'master' if 'main' fails
            if (branch === 'main') {
                return await getLatestCommit(owner, repo, 'master');
            }
            console.error(`Failed to fetch latest commit: ${response.status} ${response.statusText}`);
            return null;
        }
        
        const data = await response.json();
        return {
            sha: data.sha.substring(0, 7), // Short SHA
            message: data.commit.message.split('\n')[0], // First line of commit message
            author: data.commit.author.name,
            date: data.commit.author.date,
        };
    } catch (error) {
        console.error('Error fetching latest commit:', error);
        return null;
    }
}

module.exports = {
    getLatestRelease,
    getLatestCommit,
};

