module.exports = {
  scripts: {
    "reset-pinecone": "npx tsx src/scripts/reset-pinecone-index.ts",
    "check-pinecone": "curl http://localhost:3000/api/pinecone/status"
  }
};