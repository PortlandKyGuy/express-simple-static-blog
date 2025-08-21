const fs = require('fs');
const path = require('path');

class BlogParser {
    constructor(config) {
        this.config = config;
        this.metadataParsers = {
            'html-comment': this.parseHtmlCommentMetadata.bind(this),
            'front-matter': this.parseFrontMatterMetadata.bind(this)
        };
    }

    /**
     * Parse a blog file and extract metadata
     * @param {string} filePath - Path to the blog file
     * @returns {Object} Blog object with metadata
     */
    parseFile(filePath) {
        const fileName = path.basename(filePath);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        // Get metadata parser based on configuration
        const parser = this.metadataParsers[this.config.metadataFormat] || this.metadataParsers['html-comment'];
        const metadata = parser(fileContent);
        
        // Extract date parts if date is in YYYY-MM-DD format
        let year, month, day;
        if (metadata.date && typeof metadata.date === 'string') {
            const parts = metadata.date.split('-');
            if (parts.length === 3) {
                [year, month, day] = parts;
            }
        }

        return {
            fileName,
            filePath,
            date: metadata.date || 'No date found',
            title: metadata.title || 'Untitled',
            desc: metadata.desc || 'No description available',
            content: fileContent,
            year,
            month,
            day,
            slug: this.generateSlug(metadata.title || fileName),
            ...metadata.extra // Any additional metadata
        };
    }

    /**
     * Parse HTML comment style metadata
     * @param {string} content - File content
     * @returns {Object} Parsed metadata
     */
    parseHtmlCommentMetadata(content) {
        const metadata = {
            extra: {}
        };

        // Extract date
        const dateMatch = content.match(/<!--\s*\[date:\s*(.+?)\]\s*-->/);
        if (dateMatch) {
            metadata.date = dateMatch[1].trim();
        }

        // Extract description
        const descMatch = content.match(/<!--\s*\[desc:\s*(.+?)\]\s*-->/);
        if (descMatch) {
            metadata.desc = descMatch[1].trim();
        }

        // Extract title from HTML title tag
        const titleMatch = content.match(/<title>(.+?)<\/title>/);
        if (titleMatch) {
            metadata.title = titleMatch[1].trim();
        }

        // Extract any custom metadata
        const customMetaRegex = /<!--\s*\[(\w+):\s*(.+?)\]\s*-->/g;
        let match;
        while ((match = customMetaRegex.exec(content)) !== null) {
            const key = match[1];
            if (key !== 'date' && key !== 'desc') {
                metadata.extra[key] = match[2].trim();
            }
        }

        return metadata;
    }

    /**
     * Parse front matter style metadata (YAML-like)
     * @param {string} content - File content
     * @returns {Object} Parsed metadata
     */
    parseFrontMatterMetadata(content) {
        const metadata = {
            extra: {}
        };

        // Simple front matter parser (between --- lines)
        const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontMatterMatch) {
            return this.parseHtmlCommentMetadata(content); // Fallback
        }

        const frontMatter = frontMatterMatch[1];
        const lines = frontMatter.split('\n');

        for (const line of lines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                
                switch(key) {
                    case 'date':
                        metadata.date = value;
                        break;
                    case 'title':
                        metadata.title = value;
                        break;
                    case 'description':
                    case 'desc':
                        metadata.desc = value;
                        break;
                    default:
                        metadata.extra[key] = value;
                }
            }
        }

        // Try to get title from HTML if not in front matter
        if (!metadata.title) {
            const titleMatch = content.match(/<title>(.+?)<\/title>/);
            if (titleMatch) {
                metadata.title = titleMatch[1].trim();
            }
        }

        return metadata;
    }

    /**
     * Generate URL-friendly slug from title
     * @param {string} title - Blog title
     * @returns {string} URL slug
     */
    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove non-word chars
            .replace(/\s+/g, '-')      // Replace spaces with -
            .replace(/--+/g, '-')      // Replace multiple - with single -
            .trim();
    }

    /**
     * Validate date format
     * @param {string} dateString - Date string to validate
     * @returns {boolean} True if valid
     */
    isValidDate(dateString) {
        if (!dateString || typeof dateString !== 'string') {
            return false;
        }

        // Check format (YYYY-MM-DD)
        const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
        const match = dateString.match(dateRegex);
        
        if (!match) {
            return false;
        }

        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);

        // Validate date components
        const testDate = new Date(year, month - 1, day);
        
        return testDate.getFullYear() === year &&
               testDate.getMonth() === month - 1 &&
               testDate.getDate() === day;
    }
}

module.exports = BlogParser;