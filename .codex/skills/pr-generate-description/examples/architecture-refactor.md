# Example: Architecture Refactor PR with Motivation

Style: Concise | Sections: Motivation, What's New, Testing

---

## Motivation

Refactor property ingestion to follow event sourcing principles by separating the vector embedding side effect from the command handler into a dedicated reaction. This improves testability, enables independent scaling of indexing operations, and ensures commands remain pure event emitters without blocking I/O operations.

## What's New

**Architecture Refactoring**

- Extract vector embedding logic from `propertyIngestion.ts` command handler into new `indexProperty.ts` reaction to eliminate side effects in command handlers
- Remove ~100 lines of embedding code including `extractSemanticText()` and `embeddingProperties()` functions from command handler
- Simplify command response chain by removing `embeddingResult` from return type

**Reaction Implementation**

- Add `indexProperty` reaction at `/api/v1/property-ingestion/reaction/index-property` that listens to `PropertiesExtracted` events
- Implement semantic text extraction (`extractSemanticText()`) for property details including title, address, property type, bedrooms/bathrooms, price, and description
- Generate embeddings via `transformer().embedding()` and upsert to `Property_Embeddings` Qdrant collection
- Emit `IndexingCompleted` event on success with `propertyId`, `collectionName`, `vectorDimensions`, and `vectorCount`
- Emit `IndexingFailed` event on error with `propertyId`, `collectionName`, and `error` message
- Return `ErrorMustRetry` on failures to enable Ambar retry mechanism

**Infrastructure Configuration**

- Add `PropertyExtraction_Reaction_IndexProperty` data destination to `ambar-config.yaml` with HTTP push endpoint configuration
- Register reaction controller in `backend/src/index.ts` with route `/api/v1/property-ingestion/reaction/index-property`

## Testing & Feedback

- Verify that property ingestion still triggers embedding generation end-to-end
- Check `IndexingCompleted` and `IndexingFailed` events are emitted correctly
- Confirm retry behavior on transient failures via Ambar

If you find any bugs or have recommendations for improvements, please open an issue and assign it to me.
