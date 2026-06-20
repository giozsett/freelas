import { createContext, useState, useEffect, useContext } from 'react';

const RoleContext = createContext();

export const RoleProvider = ({ children }) => {
  // 'freelancer' or 'contractor'
  const [role, setRole] = useState(localStorage.getItem('platform_role') || 'freelancer');

  useEffect(() => {
    document.documentElement.setAttribute('data-role', role);
  }, [role]);

  const toggleRole = () => {
    const newRole = role === 'freelancer' ? 'contractor' : 'freelancer';
    setRole(newRole);
    localStorage.setItem('platform_role', newRole);
    document.documentElement.setAttribute('data-role', newRole);
  };

  return (
    <RoleContext.Provider value={{ role, toggleRole }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
