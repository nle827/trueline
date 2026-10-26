import type { Metadata } from "next";
import { JobScreen } from "@/features/jobs/JobScreen";

export const metadata: Metadata = { title: "Job" };

export default function JobPage() {
  return <JobScreen />;
}
