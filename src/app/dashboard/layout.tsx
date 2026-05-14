'use client';

import Sidebar from '@/components/Sidebar';
import { createContext, useContext, useState } from 'react';

type SidebarContextType = {
    isOpen: boolean;
    setIsOpen: (val: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) throw new Error('useSidebar must be used within DashboardLayout');
    return context;
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
            <div className="flex min-h-screen w-full relative">
                <Sidebar />
                <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto no-scrollbar">
                    {children}
                </div>
            </div>
        </SidebarContext.Provider>
    );
}
