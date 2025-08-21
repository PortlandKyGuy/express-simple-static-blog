const BlogCache = require('./lib/blogCache');
const BlogParser = require('./lib/blogParser');
const createBlogRouter = require('./lib/blogRouter');
const path = require('path');
const fs = require('fs');

/**
 * Express Simple Static Blog
 * @class ExpressStaticBlog
 */
class ExpressStaticBlog {
    /**
     * Create a new blog instance
     * @param {Object} options - Configuration options
     * @param {string} options.blogsDir - Directory containing blog HTML files
     * @param {boolean} [options.cache=true] - Enable in-memory caching
     * @param {string} [options.dateFormat='YYYY-MM-DD'] - URL date format
     * @param {string} [options.metadataFormat='html-comment'] - Metadata format ('html-comment' or 'front-matter')
     * @param {string} [options.routePrefix='/blogs'] - URL prefix for blog routes
     * @param {string} [options.sortOrder='desc'] - Sort order ('desc' or 'asc')
     * @param {boolean} [options.paginate=false] - Enable pagination
     * @param {number} [options.perPage=10] - Items per page when paginating
     * @param {string} [options.feedTitle] - RSS feed title
     * @param {string} [options.feedDescription] - RSS feed description
     * @param {string} [options.feedLanguage] - RSS feed language
     */
    constructor(options = {}) {
        // Default configuration
        this.config = {
            blogsDir: options.blogsDir || './blogs',
            cache: options.cache !== false,
            dateFormat: options.dateFormat || 'YYYY-MM-DD',
            metadataFormat: options.metadataFormat || 'html-comment',
            routePrefix: options.routePrefix || '/blogs',
            sortOrder: options.sortOrder || 'desc',
            paginate: options.paginate || false,
            perPage: options.perPage || 10
        };

        // Resolve absolute paths
        this.config.blogsDir = path.resolve(this.config.blogsDir);

        // Initialize components
        this.parser = new BlogParser(this.config);
        this.cache = new BlogCache(this.config, this.parser);
        
        // Initialize cache if enabled
        if (this.config.cache) {
            this.cache.refresh();
        }
    }

    /**
     * Get Express router with all blog routes
     * @returns {express.Router} Express router instance
     * @example
     * const blog = expressStaticBlog({ blogsDir: './blogs' });
     * app.use(blog.router());
     */
    router() {
        return createBlogRouter(this);
    }

    /**
     * Get all blog posts
     * @returns {Array<Object>} Array of blog objects sorted by date
     * @returns {string} returns[].date - Post date (YYYY-MM-DD)
     * @returns {string} returns[].title - Post title
     * @returns {string} returns[].desc - Post description
     * @returns {string} returns[].content - Full HTML content
     */
    getAll() {
        return this.cache.getAll();
    }

    /**
     * Get blog by date
     * @param {string} date - Date in configured format (default: YYYY-MM-DD)
     * @returns {Object|null} Blog object or null if not found
     * @example
     * const post = blog.getByDate('2025-01-20');
     */
    getByDate(date) {
        return this.cache.getByDate(date);
    }

    /**
     * Get recent blog posts
     * @param {number} [count=5] - Number of posts to return
     * @returns {Array<Object>} Array of most recent blog objects
     * @example
     * const recentPosts = blog.getRecent(3);
     */
    getRecent(count = 5) {
        return this.cache.getRecent(count);
    }

    /**
     * Get blog by URL slug
     * @param {string} slug - URL slug
     * @returns {Object|null} Blog object or null if not found
     * @example
     * const post = blog.getBySlug('my-first-post');
     */
    getBySlug(slug) {
        return this.cache.getBySlug(slug);
    }

    /**
     * Manually refresh the blog cache
     * @returns {void}
     * @example
     * blog.refresh(); // Re-read all blog files
     */
    refresh() {
        this.cache.refresh();
    }

    /**
     * Get paginated blog posts
     * @param {number} [page=1] - Page number (1-based)
     * @param {number} [perPage] - Items per page (defaults to config.perPage)
     * @returns {Object} Paginated result
     * @returns {Array<Object>} returns.items - Blog posts for this page
     * @returns {number} returns.currentPage - Current page number
     * @returns {number} returns.totalPages - Total number of pages
     * @returns {number} returns.totalItems - Total number of posts
     * @returns {boolean} returns.hasNext - Whether there is a next page
     * @returns {boolean} returns.hasPrev - Whether there is a previous page
     * @example
     * const page = blog.getPaginated(1, 10);
     */
    getPaginated(page = 1, perPage = null) {
        return this.cache.getPaginated(page, perPage || this.config.perPage);
    }
}

/**
 * Factory function to create blog system
 * @param {Object} options - Configuration options (see ExpressStaticBlog constructor)
 * @returns {ExpressStaticBlog} Blog system instance
 * @example
 * const expressStaticBlog = require('express-simple-static-blog');
 * const blog = expressStaticBlog({
 *     blogsDir: './views/blogs',
 *     routePrefix: '/blog'
 * });
 */
module.exports = function createBlogSystem(options) {
    return new ExpressStaticBlog(options);
};

// Export class for advanced usage
module.exports.ExpressStaticBlog = ExpressStaticBlog;