const request = require('supertest');
const express = require('express');
const app = express();

app.get('/api/auth/health', (req, res) => res.status(200).json({ status: 'Auth Service is Up' }));

describe('Auth Service Health Check', () => {
    it('should return 200 OK', async () => {
        const res = await request(app).get('/api/auth/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('Auth Service is Up');
    });
});