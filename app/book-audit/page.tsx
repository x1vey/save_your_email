import { MiniNavbar } from "@/components/ui/sign-in-flow-1";
import { Card, CardContent } from "@/components/ui/8bit-card";
import { Button } from "@/components/ui/8bit-button";

export default function BookAudit() {
  return (
    <div className="min-h-screen bg-background retro flex flex-col items-center pt-32 px-4 pb-24">
      <MiniNavbar />
      <Card className="max-w-xl w-full p-8 bg-white text-center">
        <h1 className="text-3xl font-bold mb-6 leading-relaxed uppercase">Book an Audit</h1>
        <CardContent>
          <p className="text-[10px] leading-loose text-gray-600 uppercase mb-8">
            Need a professional to look at your setup? Our deliverability experts will review your infrastructure, copy, and sending habits.
          </p>
          <div className="flex flex-col space-y-4">
            <input type="text" placeholder="NAME" className="w-full bg-white border-4 border-black p-4 text-[10px] uppercase shadow-[4px_4px_0_0_#000] focus:outline-none" />
            <input type="email" placeholder="EMAIL" className="w-full bg-white border-4 border-black p-4 text-[10px] uppercase shadow-[4px_4px_0_0_#000] focus:outline-none" />
            <Button className="w-full py-6 text-xs mt-4">REQUEST CALENDAR LINK</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
