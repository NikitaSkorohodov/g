const fs = require('fs');
const path = require('path');
const sequelize = require('./config/db'); // Импортируйте объект sequelize из файла db.js
const Book = require('./create/book'); // Импортируйте модель Book из файла book.js
const Author = require('./create/author'); // Импортируйте модель Author из файла author.js
const Category = require('./create/category');

// Define associations
Book.belongsToMany(Author, { through: 'BookAuthor' });
Author.belongsToMany(Book, { through: 'BookAuthor' });

Book.belongsToMany(Category, { through: 'BookCategory' });
Category.belongsToMany(Book, { through: 'BookCategory' });

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to the database.');

  
    await sequelize.sync();

    
    const rawData = fs.readFileSync(path.join(__dirname, 'books-data.json'));
    const booksData = JSON.parse(rawData);

    const authorsMap = new Map();
    const categoriesMap = new Map();

    for (const bookData of booksData) {
      const authors = bookData.authors;
      const categories = bookData.categories;

      for (const authorName of authors) {
        if (!authorsMap.has(authorName)) {
          authorsMap.set(authorName, { name: authorName });
        }
      }

      for (const categoryName of categories) {
        if (!categoriesMap.has(categoryName)) {
          categoriesMap.set(categoryName, { name: categoryName });
        }
      }
    }

    const authorRecords = Array.from(authorsMap.values());
    const categoryRecords = Array.from(categoriesMap.values());

    await Author.bulkCreate(authorRecords);
    await Category.bulkCreate(categoryRecords);

    const authorsFromDB = await Author.findAll();
    const categoriesFromDB = await Category.findAll();

    for (const bookData of booksData) {
      const book = await Book.create(bookData);

      for (const categoryName of bookData.categories) {
        const category = categoriesFromDB.find((category) => category.name === categoryName);
        if (category) {
          await book.addCategory(category);
        }
      }

      for (const authorName of bookData.authors) {
        const author = authorsFromDB.find((author) => author.name === authorName);
        if (author) {
          await book.addAuthor(author);
        }
      }
    }

    console.log('Data imported successfully.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
    console.log('Connection closed.');
  }
})();
