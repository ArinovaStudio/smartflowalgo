import type { Metadata } from "next";
import ScriptIndicatorManagement from "@/sections/other/ScriptIndicatorManagement";

export const metadata: Metadata = {
  title: "Pine Script Indicators | Admin",
  description: "Create and manage Pine Script indicator codes, upload .txt/.pine files, assign subscription plans, and manage release states.",
};

export default function AdminScriptsPage() {
  return <ScriptIndicatorManagement />;
}
