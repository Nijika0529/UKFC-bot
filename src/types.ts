
export interface MessageRecord {
  sender: string;
  user_id: number;
  time: string;
  content: string;
  replyName: string | null;
  replyText: string | null;
}