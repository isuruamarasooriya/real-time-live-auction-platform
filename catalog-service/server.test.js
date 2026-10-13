const request = require('supertest');
const express = require('express');
const app = express();

app.get('/api/catalog/health', (req, res) => res.status(200).json({ status: 'Catalog Service is Up' }));

describe('Catalog Service Health Check', () => {
    it('should return 200 OK', async () => {
        const res = await request(app).get('/api/catalog/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('Catalog Service is Up');
    });
});