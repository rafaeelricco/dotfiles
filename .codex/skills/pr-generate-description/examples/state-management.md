# Example: State Management PR with Tables

Style: Concise | Sections: What's New, Store Interface Table, Key Actions Table, Testing

---

## What's New

**State Management Architecture**

- Centralized `useChatStore` hook using Zustand with `persist` middleware for localStorage persistence
- Type-safe branded IDs (`SessionId`, `ConversationId`, `MessageId`, `DraftId`) via discriminated unions for compile-time safety
- `RemoteData` monad pattern for async bot response states (`NotAsked`, `Loading`, `Ready`, `Failed`)
- Automatic schema validation with fallback to fresh session on corrupted storage state
- Streaming content accumulator with `appendStreamToken` and `completeStreamingResponse`

**Multi-Step Property Viewing Booking**

- 4-step wizard flow: Date/Time selection → Contact information → Review & Confirm → Completion
- Persistent `BookingDraft` tracking property details, collected data, and step progression
- Backward navigation via `goBackToBookingStep` to edit previous selections (steps 1-3)
- Automatic conversation mode switching between `conversation` and `booking-visit`

**Conversation Management**

- Session-based architecture supporting multiple independent conversations
- Auto-generated conversation titles from first user message
- Dropdown menu in chat header to select and delete past conversations
- Page reload recovery with full conversation and booking draft restoration

## Store State Interface

| Field | Type | Description |
| ----- | ---- | ----------- |
| `session` | `Session` | Contains all conversations and metadata |
| `conversationId` | `Maybe<ConversationId>` | Active conversation (Nothing = new chat) |
| `userInput` | `string` | Current input field value |
| `botResponse` | `RemoteData<Error, Message>` | Async response state |
| `streamingContent` | `string` | Token accumulator during streaming |
| `bookingState.drafts` | `TreeMap<DraftId, BookingDraft>` | Active and completed booking drafts |

## Key Actions

| Action | Purpose |
| ------ | ------- |
| `sendMessage` | Add user message, create conversation if needed, set Loading state |
| `appendStreamToken` | Accumulate streaming response tokens |
| `completeStreamingResponse` | Finalize stream as Message, reset state |
| `startBooking` | Initialize booking flow with property data |
| `updateBookingDraft` | Progress booking step, merge collected data |
| `goBackToBookingStep` | Navigate backward in wizard (steps 1-3) |
| `completeBooking` / `cancelBooking` | Finalize or abandon booking workflow |

## Testing & Feedback

We encourage testing the following areas:

- Multi-step booking flow with property selection, date/time input, contact info, and confirmation
- Conversation persistence: reload page and verify chat history restoration
- Backward navigation in booking steps and data preservation
- Conversation switching and deletion via header dropdown

If you find any bugs or have recommendations for improvements, please open an issue and assign it to me.
