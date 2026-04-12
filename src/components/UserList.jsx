import React from 'react';
import { useFetch } from '../hooks/useFetch';

const UserList = () => {
  const { status, data, errorMessage } = useFetch('https://jsonplaceholder.typicode.com/users');

  if (status === 'loading') return <div className="loader">Yükleniyor...</div>;
  if (status === 'error') return <div className="error-msg">Hata: {errorMessage}</div>;
  if (status === 'success') {
    return (
      <div className="user-list-demo">
        <h3>Müşteri Listesi (API Testi)</h3>
        <ul>
          {data.map(user => (
            <li key={user.id}>{user.name} - {user.email}</li>
          ))}
        </ul>
        <style>{`
          .user-list-demo {
            background: rgba(255, 255, 255, 0.05);
            padding: 1.5rem;
            border-radius: 1rem;
            margin: 2rem 0;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .user-list-demo ul {
            list-style: none;
            padding: 0;
          }
          .user-list-demo li {
            padding: 0.5rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 0.9rem;
          }
          .loader { color: var(--accent); }
          .error-msg { color: #ff5555; }
        `}</style>
      </div>
    );
  }

  return null;
};

export default UserList;
