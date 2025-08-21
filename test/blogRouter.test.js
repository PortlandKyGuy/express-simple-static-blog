const express = require('express');
const request = require('supertest');
const path = require('path');
const expressStaticBlog = require('../index');
const createBlogRouter = require('../lib/blogRouter');

describe('blogRouter', () => {
    let app;
    let blog;

    beforeEach(() => {
        // Create blog instance
        blog = expressStaticBlog({
            blogsDir: path.join(__dirname, 'fixtures', 'blogs'),
            cache: true,
            routePrefix: '/blogs',
            paginate: false,
            perPage: 10,
            feedTitle: 'Test Blog Feed',
            feedDescription: 'Test blog feed description',
            feedLanguage: 'en'
        });

        // Create Express app with router
        app = express();
        app.locals.version = '1.0.0';
        
        // Mock render for testing - need to handle both blogs.html and individual blog files
        app.set('view engine', 'html');
        app.engine('html', (filePath, options, callback) => {
            // Don't throw errors, just return the data
            callback(null, JSON.stringify({ filePath, options }));
        });
        
        // Add views directory
        app.set('views', path.join(__dirname, 'fixtures'));
        
        app.use('/blogs', blog.router());
    });

    describe('GET / (list all blogs)', () => {
        test('should return all blog posts', async () => {
            const res = await request(app).get('/blogs/');
            expect(res.status).toBe(200);
            
            const data = JSON.parse(res.text);
            expect(data.filePath).toContain('blogs.html');
            expect(data.options.blogs).toBeDefined();
            expect(Array.isArray(data.options.blogs)).toBe(true);
            expect(data.options.blogs.length).toBeGreaterThan(0);
            expect(data.options.version).toBe('1.0.0');
            expect(data.options.search).toBe('');
            expect(data.options.pagination).toBeUndefined();
        });

        test('should handle search query parameter', async () => {
            const res = await request(app).get('/blogs/?search=test');
            expect(res.status).toBe(200);
            
            const data = JSON.parse(res.text);
            expect(data.options.search).toBe('test');
            expect(data.options.blogs).toBeDefined();
            expect(Array.isArray(data.options.blogs)).toBe(true);
            // All results should contain 'test' in title, desc, or content
            data.options.blogs.forEach(blog => {
                const hasMatch = 
                    blog.title.toLowerCase().includes('test') ||
                    blog.desc.toLowerCase().includes('test') ||
                    blog.content.toLowerCase().includes('test');
                expect(hasMatch).toBe(true);
            });
        });

        test('should handle pagination when enabled', async () => {
            // Create blog with pagination enabled
            const paginatedBlog = expressStaticBlog({
                blogsDir: path.join(__dirname, 'fixtures', 'blogs'),
                cache: true,
                paginate: true,
                perPage: 2
            });
            
            const paginatedApp = express();
            paginatedApp.locals.version = '1.0.0';
            paginatedApp.set('view engine', 'html');
            paginatedApp.engine('html', (filePath, options, callback) => {
                callback(null, JSON.stringify({ filePath, options }));
            });
            paginatedApp.set('views', path.join(__dirname, 'fixtures'));
            paginatedApp.use('/blogs', paginatedBlog.router());

            const res = await request(paginatedApp).get('/blogs/?page=1');
            expect(res.status).toBe(200);
            
            const data = JSON.parse(res.text);
            expect(data.options.blogs.length).toBeLessThanOrEqual(2);
            expect(data.options.pagination).toBeDefined();
            expect(data.options.pagination.currentPage).toBe(1);
            expect(data.options.pagination.totalPages).toBeGreaterThan(0);
            expect(data.options.pagination.totalItems).toBeGreaterThan(0);
            expect(data.options.pagination.perPage).toBe(2);
        });

        test('should handle page parameter without pagination config', async () => {
            const res = await request(app).get('/blogs/?page=2');
            expect(res.status).toBe(200);
            
            const data = JSON.parse(res.text);
            // Should ignore page param and return all blogs
            expect(data.options.blogs).toBeDefined();
            expect(data.options.pagination).toBeUndefined();
        });

        test('should handle errors gracefully', async () => {
            // Mock an error in the blog system
            blog.getAll = () => { throw new Error('Database error'); };
            
            const res = await request(app).get('/blogs/');
            expect(res.status).toBe(500);
        });
    });

    describe('GET /:year-:month-:day (specific blog post)', () => {
        test('should return specific blog post by date', async () => {
            const res = await request(app).get('/blogs/2025-01-20');
            expect(res.status).toBe(200);
            
            const data = JSON.parse(res.text);
            expect(data.filePath).toContain('2025-01-20-test-post.html');
            expect(data.options.version).toBe('1.0.0');
            expect(data.options.blog).toBeDefined();
            expect(data.options.blog.title).toBe('Test Blog Post');
            expect(data.options.blog.date).toBe('2025-01-20');
        });

        test('should return 404 for non-existent blog post', async () => {
            const res = await request(app).get('/blogs/2099-12-31');
            expect(res.status).toBe(404);
        });

        test('should handle errors gracefully', async () => {
            // Mock an error in the blog system
            blog.getByDate = () => { throw new Error('Database error'); };
            
            const res = await request(app).get('/blogs/2025-01-20');
            expect(res.status).toBe(500);
        });
    });

    describe('GET /feed.rss (RSS feed)', () => {
        test('should return RSS feed with recent posts', async () => {
            const res = await request(app).get('/blogs/feed.rss');
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('application/rss+xml');
            
            // Parse XML response
            const rssContent = res.text;
            expect(rssContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
            expect(rssContent).toContain('<rss version="2.0">');
            expect(rssContent).toContain('<channel>');
            expect(rssContent).toContain('<title>Blog RSS Feed</title>');
            expect(rssContent).toContain('<description>Latest blog posts</description>');
            expect(rssContent).toContain('<language>en</language>');
            expect(rssContent).toContain('<item>');
            expect(rssContent).toContain('<guid>');
            expect(rssContent).toContain('<pubDate>');
        });

        test('should include correct blog post details in RSS items', async () => {
            const res = await request(app).get('/blogs/feed.rss');
            expect(res.status).toBe(200);
            
            const rssContent = res.text;
            // Check for specific blog post
            expect(rssContent).toContain('<title>Test Blog Post</title>');
            expect(rssContent).toContain('<description>This is a test blog post for unit testing.</description>');
            // Link will include dynamic port, so just check for the path
            expect(rssContent).toMatch(/<link>http:\/\/127\.0\.0\.1:\d+\/blogs\/2025-01-20<\/link>/);
        });

        test('should escape XML special characters', async () => {
            // Create a blog system with a post containing special characters
            const testBlog = {
                getRecent: () => [{
                    title: 'Test & <Special> Characters',
                    desc: 'Description with "quotes" and \'apostrophes\'',
                    date: '2025-01-20',
                    year: '2025',
                    month: '01',
                    day: '20'
                }],
                config: { routePrefix: '/blogs' }
            };
            
            const router = createBlogRouter(testBlog);
            const testApp = express();
            testApp.use('/blogs', router);
            
            const res = await request(testApp).get('/blogs/feed.rss');
            expect(res.status).toBe(200);
            
            const rssContent = res.text;
            expect(rssContent).toContain('Test &amp; &lt;Special&gt; Characters');
            expect(rssContent).toContain('Description with &quot;quotes&quot; and &apos;apostrophes&apos;');
        });

        test('should handle errors gracefully', async () => {
            blog.getRecent = () => { throw new Error('Database error'); };
            
            const res = await request(app).get('/blogs/feed.rss');
            expect(res.status).toBe(500);
        });
    });

    describe('GET /api/posts (JSON API)', () => {
        test('should return all posts as JSON', async () => {
            const res = await request(app).get('/blogs/api/posts');
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('application/json');
            
            const data = res.body;
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBeGreaterThan(0);
            
            // Check structure of posts
            data.forEach(post => {
                expect(post).toHaveProperty('title');
                expect(post).toHaveProperty('desc');
                expect(post).toHaveProperty('date');
                expect(post).toHaveProperty('year');
                expect(post).toHaveProperty('month');
                expect(post).toHaveProperty('day');
                expect(post).toHaveProperty('filePath');
                expect(post).toHaveProperty('content');
            });
        });

        test('should handle search parameter', async () => {
            const res = await request(app).get('/blogs/api/posts?search=test');
            expect(res.status).toBe(200);
            
            const data = res.body;
            expect(Array.isArray(data)).toBe(true);
            
            // All results should contain 'test'
            data.forEach(post => {
                const hasMatch = 
                    post.title.toLowerCase().includes('test') ||
                    post.desc.toLowerCase().includes('test') ||
                    post.content.toLowerCase().includes('test');
                expect(hasMatch).toBe(true);
            });
        });

        test('should handle year filter', async () => {
            const res = await request(app).get('/blogs/api/posts?year=2025');
            expect(res.status).toBe(200);
            
            const data = res.body;
            expect(Array.isArray(data)).toBe(true);
            
            // All posts should be from 2025
            data.forEach(post => {
                expect(post.year).toBe('2025');
            });
        });

        test('should handle year and month filter', async () => {
            const res = await request(app).get('/blogs/api/posts?year=2025&month=01');
            expect(res.status).toBe(200);
            
            const data = res.body;
            expect(Array.isArray(data)).toBe(true);
            
            // All posts should be from January 2025
            data.forEach(post => {
                expect(post.year).toBe('2025');
                expect(post.month).toBe('01');
            });
        });

        test('should handle pagination parameters', async () => {
            const res = await request(app).get('/blogs/api/posts?page=1&per_page=2');
            expect(res.status).toBe(200);
            
            const data = res.body;
            expect(data).toHaveProperty('items');
            expect(data).toHaveProperty('pagination');
            expect(data.items.length).toBeLessThanOrEqual(2);
            expect(data.pagination.currentPage).toBe(1);
            expect(data.pagination.perPage).toBe(2);
            expect(data.pagination.totalPages).toBeGreaterThan(0);
            expect(data.pagination.totalItems).toBeGreaterThan(0);
        });

        test('should handle invalid page numbers in pagination', async () => {
            const res = await request(app).get('/blogs/api/posts?page=999&per_page=2');
            expect(res.status).toBe(200);
            
            const data = res.body;
            expect(data.pagination.currentPage).toBeLessThanOrEqual(data.pagination.totalPages);
        });

        test('should handle errors gracefully', async () => {
            blog.getAll = () => { throw new Error('Database error'); };
            
            const res = await request(app).get('/blogs/api/posts');
            expect(res.status).toBe(500);
        });
    });

    describe('GET /api/posts/:year-:month-:day (specific post JSON)', () => {
        test('should return specific post as JSON', async () => {
            const res = await request(app).get('/blogs/api/posts/2025-01-20');
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('application/json');
            
            const data = res.body;
            expect(data.title).toBe('Test Blog Post');
            expect(data.desc).toBe('This is a test blog post for unit testing.');
            expect(data.date).toBe('2025-01-20');
            expect(data.year).toBe('2025');
            expect(data.month).toBe('01');
            expect(data.day).toBe('20');
        });

        test('should return 404 for non-existent post', async () => {
            const res = await request(app).get('/blogs/api/posts/2099-12-31');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Blog not found' });
        });

        test('should handle errors gracefully', async () => {
            blog.getByDate = () => { throw new Error('Database error'); };
            
            const res = await request(app).get('/blogs/api/posts/2025-01-20');
            expect(res.status).toBe(500);
        });
    });

    describe('sanitizeBlogForAPI', () => {
        test('should pass through all blog properties', async () => {
            const res = await request(app).get('/blogs/api/posts/2025-01-20');
            expect(res.status).toBe(200);
            
            const data = res.body;
            // Verify sanitizeBlogForAPI doesn't remove properties
            expect(data).toHaveProperty('title');
            expect(data).toHaveProperty('desc');
            expect(data).toHaveProperty('date');
            expect(data).toHaveProperty('year');
            expect(data).toHaveProperty('month');
            expect(data).toHaveProperty('day');
            expect(data).toHaveProperty('filePath');
            expect(data).toHaveProperty('content');
        });
    });

    describe('error handling middleware', () => {
        test('should pass errors to Express error handler', async () => {
            // Create app with custom error handler
            const errorApp = express();
            errorApp.use('/blogs', blog.router());
            // eslint-disable-next-line no-unused-vars
            errorApp.use((err, req, res, next) => {
                res.status(err.status || 500).json({ error: err.message });
            });

            // Force an error
            blog.getAll = () => { throw new Error('Test error'); };
            
            const res = await request(errorApp).get('/blogs/');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Test error' });
        });
    });
});