const express = require('express');

/**
 * Create Express router for blog system
 * @param {ExpressStaticBlog} blogSystem - Blog system instance
 * @returns {Router} Express router
 */
function createBlogRouter(blogSystem) {
    const router = express.Router();
    const config = blogSystem.config;


    /**
     * GET /blogs (or configured prefix)
     * List all blog posts
     */
    router.get('/', (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const search = req.query.search || '';

            let blogs;
            if (search) {
                blogs = blogSystem.cache.search(search);
            } else if (config.paginate) {
                const result = blogSystem.getPaginated(page);
                blogs = result.items;
                res.locals.pagination = result.pagination;
            } else {
                blogs = blogSystem.getAll();
            }

            // Add additional data to response locals
            res.locals.blogs = blogs;
            res.locals.search = search;

            // Always render blogs.html template from consuming app
            res.render('blogs.html', {
                blogs,
                pagination: res.locals.pagination,
                search,
                version: req.app.locals.version || '1.0.0'
            });
        } catch (error) {
            next(error);
        }
    });

    /**
     * GET /blogs/:year-:month-:day
     * Display specific blog post by date
     */
    router.get('/:year-:month-:day', (req, res, next) => {
        try {
            const { year, month, day } = req.params;
            const blog = blogSystem.getByDate({ year, month, day });

            if (!blog) {
                const error = new Error('Blog not found');
                error.status = 404;
                return next(error);
            }

            // Render the blog HTML file directly
            res.render(blog.filePath, {
                version: req.app.locals.version || '1.0.0',
                blog // Make blog data available to template
            });
        } catch (error) {
            next(error);
        }
    });


    /**
     * GET /blogs/feed.rss
     * RSS feed
     */
    router.get('/feed.rss', (req, res, next) => {
        try {
            const blogs = blogSystem.getRecent(20);
            const baseUrl = `${req.protocol}://${req.get('host')}${config.routePrefix}`;
            
            const rss = generateRSSFeed(blogs, {
                title: config.feedTitle || 'Blog RSS Feed',
                description: config.feedDescription || 'Latest blog posts',
                link: baseUrl,
                language: config.feedLanguage || 'en'
            });

            res.set('Content-Type', 'application/rss+xml');
            res.send(rss);
        } catch (error) {
            next(error);
        }
    });

    /**
     * GET /blogs/api/posts
     * JSON API endpoint
     */
    router.get('/api/posts', (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.per_page) || 10;
            const search = req.query.search || '';
            const year = req.query.year;
            const month = req.query.month;

            let blogs;
            if (search) {
                blogs = blogSystem.cache.search(search);
            } else if (year && month) {
                blogs = blogSystem.cache.getByYearMonth(year, month);
            } else if (year) {
                blogs = blogSystem.cache.getByYear(year);
            } else {
                blogs = blogSystem.getAll();
            }

            // Paginate results
            if (req.query.page) {
                const totalItems = blogs.length;
                const totalPages = Math.ceil(totalItems / perPage);
                const currentPage = Math.max(1, Math.min(page, totalPages));
                const startIndex = (currentPage - 1) * perPage;
                const endIndex = startIndex + perPage;

                res.json({
                    items: blogs.slice(startIndex, endIndex).map(sanitizeBlogForAPI),
                    pagination: {
                        currentPage,
                        totalPages,
                        totalItems,
                        perPage
                    }
                });
            } else {
                res.json(blogs.map(sanitizeBlogForAPI));
            }
        } catch (error) {
            next(error);
        }
    });

    /**
     * GET /blogs/api/posts/:year-:month-:day
     * Get specific post via API
     */
    router.get('/api/posts/:year-:month-:day', (req, res, next) => {
        try {
            const { year, month, day } = req.params;
            const blog = blogSystem.getByDate({ year, month, day });

            if (!blog) {
                return res.status(404).json({ error: 'Blog not found' });
            }

            res.json(sanitizeBlogForAPI(blog));
        } catch (error) {
            next(error);
        }
    });

    return router;
}

/**
 * Sanitize blog object for API response
 * @param {Object} blog - Blog object
 * @returns {Object} Sanitized blog object
 */
function sanitizeBlogForAPI(blog) {
    const { ...publicData } = blog;
    return publicData;
}

/**
 * Generate RSS feed XML
 * @param {Array} blogs - Blog posts
 * @param {Object} options - Feed options
 * @returns {string} RSS XML
 */
function generateRSSFeed(blogs, options) {
    const escapeXml = str => {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    };

    const items = blogs.map(blog => `
    <item>
      <title>${escapeXml(blog.title)}</title>
      <link>${options.link}/${blog.year}-${blog.month}-${blog.day}</link>
      <description>${escapeXml(blog.desc)}</description>
      <pubDate>${new Date(blog.date).toUTCString()}</pubDate>
      <guid>${options.link}/${blog.year}-${blog.month}-${blog.day}</guid>
    </item>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(options.title)}</title>
    <link>${escapeXml(options.link)}</link>
    <description>${escapeXml(options.description)}</description>
    <language>${options.language}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;
}

module.exports = createBlogRouter;