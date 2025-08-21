const express = require('express');
const path = require('path');
const expressStaticBlog = require('express-simple-static-blog');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize the blog system
const blog = expressStaticBlog({
    blogsDir: path.join(__dirname, 'views', 'blogs'),
    routePrefix: '/blog',
    cache: true,
    paginate: true,
    perPage: 5,
    feedTitle: 'My Example Blog',
    feedDescription: 'A simple blog using express-simple-static-blog',
    feedLanguage: 'en'
});

// Mount the blog router
app.use(blog.router());

// Home page
app.get('/', (req, res) => {
    const recentPosts = blog.getRecent(3);
    res.render('index', { 
        title: 'Welcome to My Blog',
        recentPosts: recentPosts
    });
});

// About page
app.get('/about', (req, res) => {
    res.render('about', { title: 'About' });
});

// Error handling
app.use((req, res) => {
    res.status(404).render('404', { title: 'Page Not Found' });
});

app.use((err, req, res) => {
    console.error(err.stack);
    res.status(500).render('error', { 
        title: 'Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Blog available at http://localhost:${PORT}/blog`);
});