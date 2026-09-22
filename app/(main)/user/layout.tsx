import { PortalProvider } from "@/components/user/PortalContext";
import PortalShell from "@/components/user/PortalShell";

export default function UserLayout({ children }: { children: React.ReactNode }) {
    return (
        <PortalProvider>
            <PortalShell>{children}</PortalShell>
        </PortalProvider>
    );
}