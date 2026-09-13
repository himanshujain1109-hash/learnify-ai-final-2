import { QdrantClient } from '@qdrant/js-client-rest';
import { Document } from 'langchain/document';

// Initialize Qdrant Client (Requires a local or cloud Qdrant instance)
// E.g., docker run -p 6333:6333 qdrant/qdrant
const qdrantClient = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333' });
const COLLECTION_NAME = "learnify_documents";

/**
 * Initializes the vector collection if it doesn't exist.
 */
export async function initVectorStore() {
    try {
        const collections = await qdrantClient.getCollections();
        const exists = collections.collections.find(c => c.name === COLLECTION_NAME);
        if (!exists) {
            await qdrantClient.createCollection(COLLECTION_NAME, {
                vectors: {
                    size: 768, // e.g., Nomic Embed Text dimensions
                    distance: 'Cosine'
                }
            });
            console.log(`Created Qdrant collection: ${COLLECTION_NAME}`);
        }
    } catch (error) {
        console.error("Failed to initialize Qdrant:", error);
    }
}

/**
 * Simple mock embedding function. In production, this calls a local LLM or API.
 */
async function generateEmbedding(text) {
    // Return a dummy vector of 768 dimensions for now, since embedding setup is environment-specific.
    return new Array(768).fill(Math.random());
}

/**
 * Indexes document chunks into Qdrant.
 */
export async function indexDocumentChunks(documentId, chunks) {
    try {
        const points = await Promise.all(chunks.map(async (chunk, i) => {
            const vector = await generateEmbedding(chunk.text);
            return {
                id: `${documentId}-${i}`, // deterministic ID
                vector: vector,
                payload: {
                    documentId: documentId,
                    text: chunk.text,
                    title: chunk.title
                }
            };
        }));
        
        await qdrantClient.upsert(COLLECTION_NAME, { points });
        console.log(`Indexed ${points.length} chunks for document ${documentId}`);
    } catch (error) {
        console.error("Failed to index chunks into Qdrant:", error);
    }
}

/**
 * Searches for the most relevant chunks using Vector Similarity.
 */
export async function semanticSearch(documentId, query, limit = 5) {
    try {
        const queryVector = await generateEmbedding(query);
        
        const results = await qdrantClient.search(COLLECTION_NAME, {
            vector: queryVector,
            limit: limit,
            filter: {
                must: [
                    {
                        key: "documentId",
                        match: { value: documentId }
                    }
                ]
            }
        });
        
        return results.map(r => ({
            id: r.id,
            title: r.payload.title,
            text: r.payload.text,
            score: r.score
        }));
    } catch (error) {
        console.error("Failed semantic search:", error);
        return [];
    }
}
