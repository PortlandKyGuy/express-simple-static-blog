# express-simple-static-blog

[![npm version](https://badge.fury.io/js/express-simple-static-blog.svg)](https://www.npmjs.com/package/express-simple-static-blog)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/express-simple-static-blog.svg)](https://nodejs.org)

A simple, configurable static blog system for Express.js applications. This library allows you to quickly add a blog to your Express app using static HTML files with minimal configuration. It isn't intended to be a long term solution. More of a quick answer to get up some blogs on your site while you figure out your long-term blog strategies. 

This is not an automated CMS tool. You will need to deploy and/or stop-and-start your service each time you add a blog.

## Features

- 📁 File-based blog posts (HTML files)
- 🚀 In-memory caching for fast performance
- 🎨 Clean separation - you own the templates
- 📅 Date-based URL routing
- 🔍 Built-in search functionality
- 📄 Pagination support
- 📡 RSS feed generation
- 🌐 JSON API endpoints
- ⚡ Zero database dependency

## Why Use This?

- **Simple**: No database setup, no complex configuration. Just HTML files.
- **Fast**: In-memory caching means your blog loads quickly.
- **Flexible**: Use your own templates and styling - this library just handles the blog logic.
- **SEO-Friendly**: Clean URLs, RSS feeds, and static content that search engines love.
- **Developer-Friendly**: Built for Express.js developers who want to add a blog without the bloat.

## Installation

```bash
npm install express-simple-static-blog
```

## Quick Start

```javascript
const express = require('express');
const expressStaticBlog = require('express-simple-static-blog');

const app = express();

// Set up view engine and views directory. This is a typical step with Express and EJS.
app.set('view engine', 'ejs');
app.set('views', './views');

// Initialize the blog system
const blog = expressStaticBlog({
    blogsDir: './views/blogs',      // Directory containing blog HTML files
    routePrefix: '/blogs'           // URL prefix for blog routes
});

// Mount the blog router
app.use(blog.router());

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
```

## Blog File Format

Blog posts are HTML files with metadata in the Title element and HTML comments for 'date' and 'desc':

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My First Blog Post</title>  
    <!-- [date: 2025-08-15] -->
    <!-- [desc: This is a description of my blog post.] -->
</head>
<body>
    <h1>My First Blog Post</h1>
    <p>Your blog content goes here...</p>
</body>
</html>
```

## Configuration Options

```javascript
const blog = expressStaticBlog({
    // Required
    blogsDir: './blogs',            // Path to blog HTML files
    
    // Optional
    cache: true,                    // Enable in-memory caching (default: true)
    dateFormat: 'YYYY-MM-DD',       // URL date format (default: 'YYYY-MM-DD')
    metadataFormat: 'html-comment', // Metadata format (default: 'html-comment')
    routePrefix: '/blogs',          // URL prefix (default: '/blogs')
    sortOrder: 'desc',              // Sort order: 'desc' or 'asc' (default: 'desc')
    paginate: false,                // Enable pagination (default: false)
    perPage: 10,                    // Items per page if pagination is on (default: 10)
    
    // RSS Feed options
    feedTitle: 'Blog RSS Feed',
    feedDescription: 'Latest posts',
    feedLanguage: 'en'
});
```

## Routes

The blog system creates the following routes:

- `GET /blogs` - List all blog posts
- `GET /blogs/:year-:month-:day` - View specific blog post
- `GET /blogs/feed.rss` - RSS feed
- `GET /blogs/api/posts` - JSON API for posts
- `GET /blogs/api/posts/:year-:month-:day` - JSON API for specific post

## API Methods

```javascript
// Get all blog posts
const allPosts = blog.getAll();

// Get blog by date
const post = blog.getByDate('2025-08-15');

// Get recent posts
const recentPosts = blog.getRecent(5);

// Get paginated posts
const page = blog.getPaginated(1, 10);

// Search posts
const results = blog.cache.search('keyword');

// Refresh cache manually
blog.refresh();
```

## Templates

The library expects your Express app to have a `blogs.html` template in its views directory. The library will pass blog data to this template:

### blogs.html (Required in your views directory)
```html
<!DOCTYPE html>
<html>
<head>
    <title>Blog</title>
</head>
<body>
    <h1>Blog Posts</h1>
    
    <% if (blogs && blogs.length > 0) { %>
        <% blogs.forEach(blog => { %>
            <article>
                <h2><%= blog.title %></h2>
                <time><%= blog.date %></time>
                <p><%= blog.desc %></p>
                <a href="/blogs/<%= blog.year %>-<%= blog.month %>-<%= blog.day %>">Read more</a>
            </article>
        <% }); %>
    <% } else { %>
        <p>No blog posts available.</p>
    <% } %>
    
    <% if (pagination) { %>
        <!-- Add pagination controls here -->
    <% } %>
</body>
</html>
```

The library passes these variables to your template:
- `blogs` - Array of blog objects
- `pagination` - Pagination data (if enabled)
- `search` - Current search query
- `version` - From app.locals.version

## Front Matter Support

You can also use front matter format for metadata:

```javascript
const blog = expressStaticBlog({
    blogsDir: './blogs',
    metadataFormat: 'front-matter'
});
```

```markdown
---
date: 2025-08-15
title: My Blog Post
description: This is my blog post
tags: javascript, nodejs
---

# My Blog Post

Content goes here...
```

## Advanced Usage

### Programmatic Access

```javascript
// Get all posts sorted by date
const posts = blog.getAll();

// Get posts from a specific year
const yearPosts = blog.cache.getByYear(2025);

// Get posts from a specific month
const monthPosts = blog.cache.getByYearMonth(2025, 8);


// Get cache statistics
const stats = blog.cache.getStats();
```

### Custom Middleware

```javascript
// Add custom middleware before blog routes
app.use('/blogs', (req, res, next) => {
    // Custom logic here
    next();
}, blog.router());
```

## Migration from Existing Blog

If you have an existing blog implementation:

1. Move your blog HTML files to a dedicated directory
2. Add metadata comments to each file
3. Replace your blog routes with the library

Example migration:

```javascript
// Before
app.get('/blogs', (req, res) => {
    // Custom blog listing logic
});

// After
const blog = expressStaticBlog({
    blogsDir: './views/blogs',
    templatesDir: './views'
});
app.use(blog.router());
```

## Performance Tips

1. **Caching**: Keep caching enabled for production
2. **File Count**: The library handles hundreds of blog posts efficiently
3. **Templates**: Use custom templates to match your site design
4. **Static Assets**: Serve blog images/assets separately

## Error Handling

The library includes built-in error handling:

```javascript
app.use((err, req, res, next) => {
    if (err.status === 404) {
        res.status(404).send('Blog post not found');
    } else {
        res.status(500).send('Server error');
    }
});
```

## Troubleshooting

### Common Issues

**Blog posts not showing up?**
- Ensure your HTML files have the correct metadata format
- Check that the `blogsDir` path is correct
- Verify file permissions allow reading

**Templates not rendering?**
- Make sure you have a `blogs.html` file in your views directory
- Check that your view engine is properly configured
- Ensure EJS is installed as a peer dependency

**Performance issues?**
- Enable caching (it's on by default)
- Consider paginating if you have many posts
- Use the `getRecent()` method for homepage displays

**Date parsing errors?**
- Use the ISO format (YYYY-MM-DD) for dates
- Ensure dates are in the correct metadata format

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

Please make sure to:
- Update tests as appropriate
- Follow the existing code style
- Update documentation if needed

## License

MIT

## Support

For issues and feature requests, please use the GitHub issue tracker.