import { BottomNav } from "@/components/BottomNav";

/**
 * App shell for the four main tabs. The bottom nav is fixed; each page manages
 * its own scroll and bottom padding so content clears the bar.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
