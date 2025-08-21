const expressStaticBlog = require('../index');
const path = require('path');

describe('express-simple-static-blog', () => {
    let blog;

    beforeEach(() => {
        blog = expressStaticBlog({
            blogsDir: path.join(__dirname, 'fixtures', 'blogs'),
            cache: true
        });
    });

    describe('initialization', () => {
        test('should create blog instance with default config', () => {
            expect(blog).toBeDefined();
            expect(blog.config.cache).toBe(true);
            expect(blog.config.routePrefix).toBe('/blogs');
            expect(blog.config.sortOrder).toBe('desc');
            expect(blog.config.dateFormat).toBe('YYYY-MM-DD');
            expect(blog.config.metadataFormat).toBe('html-comment');
            expect(blog.config.paginate).toBe(false);
            expect(blog.config.perPage).toBe(10);
        });

        test('should accept custom configuration', () => {
            const customBlog = expressStaticBlog({
                blogsDir: './test',
                routePrefix: '/articles',
                sortOrder: 'asc',
                perPage: 5,
                cache: false,
                paginate: true
            });
            expect(customBlog.config.routePrefix).toBe('/articles');
            expect(customBlog.config.sortOrder).toBe('asc');
            expect(customBlog.config.perPage).toBe(5);
            expect(customBlog.config.cache).toBe(false);
            expect(customBlog.config.paginate).toBe(true);
        });

        test('should resolve blogsDir to absolute path', () => {
            const relativeBlog = expressStaticBlog({
                blogsDir: './relative/path'
            });
            expect(path.isAbsolute(relativeBlog.config.blogsDir)).toBe(true);
        });
    });

    describe('blog operations', () => {
        test('should get all blog posts sorted by date descending', () => {
            const posts = blog.getAll();
            expect(Array.isArray(posts)).toBe(true);
            expect(posts.length).toBeGreaterThanOrEqual(3);
            
            const testPost = posts.find(p => p.date === '2025-01-20');
            const olderPost = posts.find(p => p.date === '2025-01-15');
            const oldestPost = posts.find(p => p.date === '2025-01-10');
            
            expect(testPost.title).toBe('Test Blog Post');
            expect(olderPost.title).toBe('Older Blog Post');
            expect(oldestPost.title).toBe('Oldest Blog Post');
            
            const postsWithDates = posts.filter(p => p.date);
            for (let i = 1; i < postsWithDates.length; i++) {
                expect(postsWithDates[i-1].date >= postsWithDates[i].date).toBe(true);
            }
        });

        test('should sort posts ascending when configured', () => {
            const ascBlog = expressStaticBlog({
                blogsDir: path.join(__dirname, 'fixtures', 'blogs'),
                sortOrder: 'asc'
            });
            const posts = ascBlog.getAll();
            
            expect(posts[0].date).toBe('2025-01-10');
            expect(posts[1].date).toBe('2025-01-15');
            expect(posts[2].date).toBe('2025-01-20');
        });

        test('should get blog by exact date', () => {
            const post = blog.getByDate('2025-01-20');
            expect(post).toBeDefined();
            expect(post.title).toBe('Test Blog Post');
            expect(post.desc).toBe('This is a test blog post for unit testing.');
            expect(post.date).toBe('2025-01-20');
            expect(post.year).toBe('2025');
            expect(post.month).toBe('01');
            expect(post.day).toBe('20');
        });

        test('should return null for non-existent date', () => {
            const post = blog.getByDate('2099-12-31');
            expect(post).toBeNull();
        });

        test('should get recent posts in correct order', () => {
            const recent = blog.getRecent(2);
            expect(Array.isArray(recent)).toBe(true);
            expect(recent.length).toBe(2);
            
            expect(recent[0].date).toBe('2025-01-20');
            expect(recent[0].title).toBe('Test Blog Post');
            expect(recent[1].date).toBe('2025-01-15');
            expect(recent[1].title).toBe('Older Blog Post');
        });

        test('should handle getRecent with count larger than total posts', () => {
            const recent = blog.getRecent(100);
            const allPosts = blog.getAll();
            expect(recent.length).toBe(allPosts.length);
        });

        test('should get paginated results correctly', () => {
            const allPosts = blog.getAll();
            const perPage = 2;
            const page1 = blog.getPaginated(1, perPage);
            
            expect(page1.items.length).toBeLessThanOrEqual(perPage);
            expect(page1.currentPage).toBe(1);
            expect(page1.totalItems).toBe(allPosts.length);
            expect(page1.totalPages).toBe(Math.ceil(allPosts.length / perPage));
            expect(page1.hasPrev).toBe(false);
            
            for (let i = 1; i < page1.items.length; i++) {
                expect(page1.items[i-1].date >= page1.items[i].date).toBe(true);
            }
            
            const lastPage = blog.getPaginated(page1.totalPages, perPage);
            expect(lastPage.hasNext).toBe(false);
            expect(lastPage.hasPrev).toBe(page1.totalPages > 1);
        });

        test('should handle invalid page numbers in pagination', () => {
            const page0 = blog.getPaginated(0, 2);
            expect(page0.currentPage).toBe(1);
            
            const pageHigh = blog.getPaginated(99, 2);
            expect(pageHigh.items.length).toBe(0);
            expect(pageHigh.currentPage).toBe(99);
        });
    });

    describe('router', () => {
        test('should return Express router with correct routes', () => {
            const router = blog.router();
            expect(router).toBeDefined();
            expect(typeof router).toBe('function');
            expect(router.stack).toBeDefined();
            
            const routes = router.stack.map(layer => layer.route?.path).filter(Boolean);
            expect(routes).toContain('/');
            expect(routes).toContain('/:year-:month-:day');
            expect(routes).toContain('/feed.rss');
            expect(routes).toContain('/api/posts');
            expect(routes).toContain('/api/posts/:year-:month-:day');
        });
    });

    describe('cache operations', () => {
        test('should refresh cache without errors', () => {
            expect(() => blog.refresh()).not.toThrow();
        });

        test('should search posts by keyword', () => {
            const results = blog.cache.search('test');
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeGreaterThan(0);
            expect(results.every(post => 
                post.title.toLowerCase().includes('test') || 
                post.desc.toLowerCase().includes('test') ||
                post.content.toLowerCase().includes('test')
            )).toBe(true);
        });

        test('should return empty array for no search matches', () => {
            const results = blog.cache.search('nonexistentkeyword123');
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBe(0);
        });

        test('should have all required cache methods', () => {
            expect(typeof blog.cache.getAll).toBe('function');
            expect(typeof blog.cache.search).toBe('function');
            expect(typeof blog.cache.getByDate).toBe('function');
            expect(typeof blog.cache.getRecent).toBe('function');
            expect(typeof blog.cache.refresh).toBe('function');
        });
    });

    describe('front matter support', () => {
        test('should parse front matter metadata correctly', () => {
            const frontMatterBlog = expressStaticBlog({
                blogsDir: path.join(__dirname, 'fixtures', 'blogs'),
                metadataFormat: 'front-matter',
                cache: true
            });
            
            const posts = frontMatterBlog.getAll();
            const frontMatterPost = posts.find(p => p.title === 'Front Matter Post');
            
            expect(frontMatterPost).toBeDefined();
            expect(frontMatterPost.date).toBe('2025-01-19');
            expect(frontMatterPost.desc).toBe('This post uses front matter metadata');
            expect(frontMatterPost.year).toBe('2025');
            expect(frontMatterPost.month).toBe('01');
            expect(frontMatterPost.day).toBe('19');
            
            expect(frontMatterPost.extra).toBeDefined();
            expect(frontMatterPost.extra.tags).toBe('test, markdown, frontmatter');
            expect(frontMatterPost.extra.author).toBe('Test Author');
        });

        test('should fallback gracefully if front matter is missing', () => {
            const frontMatterBlog = expressStaticBlog({
                blogsDir: path.join(__dirname, 'fixtures', 'blogs'),
                metadataFormat: 'front-matter',
                cache: true
            });
            
            const htmlPost = frontMatterBlog.getByDate('2025-01-20');
            expect(htmlPost).toBeDefined();
            expect(htmlPost.title).toBe('Test Blog Post');
        });
    });

    describe('edge cases', () => {
        test('should handle missing blogsDir gracefully', () => {
            const invalidBlog = expressStaticBlog({
                blogsDir: path.join(__dirname, 'nonexistent')
            });
            const posts = invalidBlog.getAll();
            expect(Array.isArray(posts)).toBe(true);
            expect(posts.length).toBe(0);
        });

        test('should handle malformed blog files gracefully', () => {
            expect(() => blog.getAll()).not.toThrow();
            expect(() => blog.refresh()).not.toThrow();
            
            const posts = blog.getAll();
            
            const noDatePost = posts.find(p => p.title === 'Post Without Date');
            expect(noDatePost).toBeUndefined();
            
            const noTitlePost = posts.find(p => p.date === '2025-01-17');
            expect(noTitlePost).toBeDefined();
            expect(noTitlePost.title).toBe('Untitled');
            
            const noDescPost = posts.find(p => p.title === 'Post Without Description');
            expect(noDescPost).toBeDefined();
            expect(noDescPost.desc).toBe('No description available');
            
            posts.forEach(post => {
                expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                expect(post.title).toBeDefined();
                expect(post.title).not.toBe('');
                expect(post.desc).toBeDefined();
            });
        });

        test('should handle completely invalid HTML files', () => {
            const blogWithInvalid = expressStaticBlog({
                blogsDir: path.join(__dirname, 'fixtures', 'blogs'),
                cache: true
            });
            
            expect(() => blogWithInvalid.refresh()).not.toThrow();
            expect(() => blogWithInvalid.getAll()).not.toThrow();
        });
    });
});