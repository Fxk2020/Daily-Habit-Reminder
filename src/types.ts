export interface Task {
  id: string;
  title: string;
  time: string;
  created_at: string;
}

export interface Completion {
  task_id: string;
  date: string;
  completed: number;
}
