import userModel from '@/model/userModel';
import { createContext, useContext, useState } from 'react';


interface UserContextType {
    user: userModel | null;
    setUser: (user: userModel | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ userData, children }: { userData: userModel, children: React.ReactNode }) => {
    const [user, setUser] = useState<userModel | null>(userData);

    return (
        <UserContext.Provider value={{ user, setUser }}>
            {children}
        </UserContext.Provider>
    );
};

export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser deve ser usado dentro de um UserProvider');
    }
    return context;
}
