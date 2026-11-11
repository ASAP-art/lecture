import { SaveRepository, SAVE_KEY } from '../../src/engine/storage';
import { completedSession, MemoryStorage, SerialLocks } from './save-play';

// Run with the project's tsx CLI: Playwright's native Node loader does not transform content JSON imports.
const storage = new MemoryStorage();
const repository = new SaveRepository(storage, new SerialLocks());
if (!await repository.saveSession(completedSession())) throw new Error('실제 엔진 브라우저 fixture 저장 실패');
process.stdout.write(storage.getItem(SAVE_KEY)!);
