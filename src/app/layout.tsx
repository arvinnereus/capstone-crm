import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { getActiveBrandView } from "@/lib/brand-context";
import { CommandMenu } from "@/components/shell/command-menu";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Capstone Command Center",
	description: "Business Command Center CRM for Capstone Consulting",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const activeBrand = await getActiveBrandView();
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
			</head>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<ThemeProvider>
					<TooltipProvider>
						<SidebarProvider>
							<AppSidebar activeBrand={activeBrand} />
							<SidebarInset>
								<AppHeader />
								<main className="flex-1 p-4 md:p-6">{children}</main>
							</SidebarInset>
							<CommandMenu />
						</SidebarProvider>
						<Toaster position="top-right" richColors />
					</TooltipProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
