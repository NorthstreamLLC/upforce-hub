import { redirect } from "next/navigation";

/* Today is the daily work surface, so it is the front door. */
export default function Home() {
  redirect("/today");
}
