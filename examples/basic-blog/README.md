# Express Simple Static Blog - Basic Example

This example demonstrates a basic blog implementation using express-simple-static-blog.

## Running the Example

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Visit http://localhost:3000

## Features Demonstrated

- Basic blog setup with Express and EJS
- Home page with recent posts
- Blog listing page with pagination
- Individual blog post pages
- RSS feed at `/blog/feed.rss`
- JSON API at `/blog/api/posts`
- Error handling

## Project Structure

```
basic-blog/
├── app.js              # Express application
├── package.json        # Dependencies
├── views/              # EJS templates
│   ├── layout.ejs      # Shared layout
│   ├── index.ejs       # Home page
│   ├── blogs.ejs       # Blog listing (required by library)
│   ├── about.ejs       # About page
│   ├── 404.ejs         # 404 error page
│   ├── error.ejs       # Error page
│   └── blogs/          # Blog posts (HTML files)
│       ├── 2025-01-20-welcome-post.html
│       └── 2025-01-19-getting-started.html
└── public/             # Static assets (CSS, JS, images)
```

## Adding New Blog Posts

To add a new blog post, create an HTML file in `views/blogs/` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Your Post Title</title>
    <!-- [date: YYYY-MM-DD] -->
    <!-- [desc: Your post description] -->
</head>
<body>
    <h1>Your Post Title</h1>
    <p>Your content here...</p>
</body>
</html>
```

The blog will automatically pick up new posts on the next page load (or server restart if caching is enabled).