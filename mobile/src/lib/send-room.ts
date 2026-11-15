// F-EMX1: classifies a failed send against a fresh read of the room (see sendFailureRefetched).
import { sendFailureRefetched, type SendFailure } from './error-kind';
import { getRoom } from './rooms';

type RoomClock = { deleted_at: string | null; expires_at: string };

export function classifySend(roomId: string, error: unknown, room?: RoomClock | null): Promise<SendFailure> {
  return sendFailureRefetched(error, room, Date.now(), () => getRoom(roomId));
}
