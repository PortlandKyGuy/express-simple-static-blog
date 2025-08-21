const fs = require('fs');
const path = require('path');

class BlogCache {
    constructor(config, parser) {
        this.config = config;
        this.parser = parser;
        this.cache = [];
        this.lastRefresh = null;
    }

    /**
     * Refresh the blog cache by reading all files
     */
    refresh() {
        try {
            if (!fs.existsSync(this.config.blogsDir)) {
                console.warn(`Blog directory does not exist: ${this.config.blogsDir}`);
                this.cache = [];
                return;
            }

            const files = fs.readdirSync(this.config.blogsDir);
            const htmlFiles = files.filter(file => file.endsWith('.html') || file.endsWith('.htm'));
            
            this.cache = htmlFiles
                .map(file => {
                    try {
                        const filePath = path.join(this.config.blogsDir, file);
                        return this.parser.parseFile(filePath);
                    } catch (error) {
                        console.error(`Error parsing blog file ${file}:`, error.message);
                        return null;
                    }
                })
                .filter(blog => blog !== null && this.parser.isValidDate(blog.date))
                .sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    return this.config.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                });

            this.lastRefresh = new Date();
            console.info(`Blog cache refreshed: ${this.cache.length} posts loaded`);
        } catch (error) {
            console.error('Error refreshing blog cache:', error);
            this.cache = [];
        }
    }

    /**
     * Get all blogs from cache
     * @returns {Array} All blog posts
     */
    getAll() {
        if (!this.config.cache || !this.cache.length) {
            this.refresh();
        }
        return [...this.cache]; // Return copy to prevent external modifications
    }

    /**
     * Get blog by date
     * @param {string|Date|Object} blogDate - Date to search for
     * @returns {Object|null} Blog post or null
     */
    getByDate(blogDate) {
        const blogs = this.getAll();
        
        let year, month, day;

        // Handle different date format types
        if (typeof blogDate === 'string') {
            // String format: "2025-08-21"
            const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
            const match = blogDate.match(dateRegex);

            if (!match) {
                return null;
            }

            year = parseInt(match[1], 10);
            month = parseInt(match[2], 10);
            day = parseInt(match[3], 10);

        } else if (blogDate instanceof Date) {
            // Date object
            if (isNaN(blogDate.getTime())) {
                return null;
            }

            year = blogDate.getFullYear();
            month = blogDate.getMonth() + 1;
            day = blogDate.getDate();

        } else if (typeof blogDate === 'object' && blogDate !== null) {
            // Object format: {year: 2025, month: 8, day: 21}
            if (!blogDate.year || !blogDate.month || !blogDate.day) {
                return null;
            }

            year = parseInt(blogDate.year, 10);
            month = parseInt(blogDate.month, 10);
            day = parseInt(blogDate.day, 10);
        } else {
            return null;
        }

        // Find matching blog
        return blogs.find(blog => {
            return parseInt(blog.year, 10) === year &&
                   parseInt(blog.month, 10) === month &&
                   parseInt(blog.day, 10) === day;
        }) || null;
    }

    /**
     * Get recent blog posts
     * @param {number} count - Number of posts to return
     * @returns {Array} Recent blog posts
     */
    getRecent(count = 5) {
        const blogs = this.getAll();
        return blogs.slice(0, count);
    }

    /**
     * Get blog by slug
     * @param {string} slug - URL slug
     * @returns {Object|null} Blog post or null
     */
    getBySlug(slug) {
        const blogs = this.getAll();
        return blogs.find(blog => blog.slug === slug) || null;
    }

    /**
     * Get blogs by year
     * @param {number} year - Year to filter by
     * @returns {Array} Blog posts from that year
     */
    getByYear(year) {
        const blogs = this.getAll();
        return blogs.filter(blog => parseInt(blog.year, 10) === parseInt(year, 10));
    }

    /**
     * Get blogs by year and month
     * @param {number} year - Year to filter by
     * @param {number} month - Month to filter by
     * @returns {Array} Blog posts from that year/month
     */
    getByYearMonth(year, month) {
        const blogs = this.getAll();
        return blogs.filter(blog => 
            parseInt(blog.year, 10) === parseInt(year, 10) &&
            parseInt(blog.month, 10) === parseInt(month, 10)
        );
    }

    /**
     * Get paginated blogs
     * @param {number} page - Page number (1-based)
     * @param {number} perPage - Items per page
     * @returns {Object} Paginated result
     */
    getPaginated(page = 1, perPage = 10) {
        const blogs = this.getAll();
        const totalItems = blogs.length;
        const totalPages = Math.ceil(totalItems / perPage);
        const currentPage = Math.max(1, Math.min(page, totalPages));
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;

        return {
            items: blogs.slice(startIndex, endIndex),
            pagination: {
                currentPage,
                totalPages,
                totalItems,
                perPage,
                hasNext: currentPage < totalPages,
                hasPrev: currentPage > 1,
                nextPage: currentPage < totalPages ? currentPage + 1 : null,
                prevPage: currentPage > 1 ? currentPage - 1 : null
            }
        };
    }

    /**
     * Search blogs by keyword
     * @param {string} keyword - Search keyword
     * @param {Array} fields - Fields to search in (default: ['title', 'desc'])
     * @returns {Array} Matching blog posts
     */
    search(keyword, fields = ['title', 'desc']) {
        const blogs = this.getAll();
        const lowerKeyword = keyword.toLowerCase();
        
        return blogs.filter(blog => {
            return fields.some(field => {
                const value = blog[field];
                return value && value.toLowerCase().includes(lowerKeyword);
            });
        });
    }


    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
        return {
            totalPosts: this.cache.length,
            lastRefresh: this.lastRefresh,
            oldestPost: this.cache.length > 0 ? this.cache[this.cache.length - 1].date : null,
            newestPost: this.cache.length > 0 ? this.cache[0].date : null
        };
    }
}

module.exports = BlogCache;