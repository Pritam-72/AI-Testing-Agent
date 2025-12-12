import React, { useState } from 'react';

// Sample React component for testing AI Test Agent
export default function TodoApp() {
    const [todos, setTodos] = useState<string[]>([]);
    const [input, setInput] = useState('');

    const handleAddTodo = () => {
        if (input.trim()) {
            setTodos([...todos, input]);
            setInput('');
        }
    };

    const handleDeleteTodo = (index: number) => {
        setTodos(todos.filter((_, i) => i !== index));
    };

    return (
        <div className="todo-app">
            <h1>My Todo List</h1>

            <div className="input-section">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                    placeholder="Add a todo..."
                />
                <button onClick={handleAddTodo}>Add</button>
            </div>

            <ul className="todo-list">
                {todos.map((todo, index) => (
                    <li key={index}>
                        <span>{todo}</span>
                        <button onClick={() => handleDeleteTodo(index)}>Delete</button>
                    </li>
                ))}
            </ul>

            {todos.length === 0 && <p>No todos yet!</p>}
        </div>
    );
}

// Additional component
export function TodoItem({ text, onDelete }: { text: string; onDelete: () => void }) {
    return (
        <div className="todo-item">
            <span>{text}</span>
            <button onClick={onDelete}>Remove</button>
        </div>
    );
}

// Helper function
export function formatTodoCount(count: number): string {
    return count === 1 ? '1 item' : `${count} items`;
}
