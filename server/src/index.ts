import 'dotenv/config';
import { app } from './app.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

app.listen(PORT, () => {
  console.log(`[Server] Arc Wallet Backend running on http://localhost:${PORT}`);
});

// Export for Vercel serverless
export default app;
