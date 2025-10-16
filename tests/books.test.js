const request = require('supertest');
const app = require('../index');

describe('Books API', () => {
  describe('POST /books/:bookId/generate-questions', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/books/test-book-id/generate-questions')
        .expect(401);
      
      expect(response.body.error).toBe('UNAUTHORIZED');
    });

    it('should return 400 for invalid bookId format', async () => {
      const response = await request(app)
        .post('/books/invalid-id/generate-questions')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);
      
      expect(response.body.error).toBe('INVALID_BOOK_ID');
    });
  });
});