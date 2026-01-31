export interface OrderNoteItem {
  id?: string;
  order_note_id?: string;
  item_name: string;
  is_completed: boolean;
  created_at?: string;
}

export interface OrderNote {
  id?: string;
  note_name: string;
  note_date: string;
  items: OrderNoteItem[];
  created_at?: string;
  updated_at?: string;
}
