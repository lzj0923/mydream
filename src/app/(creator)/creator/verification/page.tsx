import { redirect } from "next/navigation";
import { CreatorAuthError, creatorAuthRequest, creatorVerification, readCreatorToken } from "@/lib/creator-auth/server";
import { CreatorVerification } from "@/components/creator-workspace/creator-verification";
export const dynamic = "force-dynamic";
export default async function Page() {
  const token=await readCreatorToken();if(!token)redirect("/creator/login");
  try { await creatorAuthRequest("me",token); }
  catch(e){if(e instanceof CreatorAuthError && e.status===401)redirect("/creator/login");throw e;}
  return <CreatorVerification initial={await creatorVerification(token)}/>;
}
