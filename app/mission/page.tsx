import { MiniNavbar } from "@/components/ui/sign-in-flow-1";
import { Card, CardContent } from "@/components/ui/8bit-card";

export default function Mission() {
  return (
    <div className="min-h-screen bg-background retro flex flex-col items-center pt-32 px-4 pb-24">
      <MiniNavbar />
      <Card className="max-w-2xl w-full p-8 bg-white text-center">
        <h1 className="text-3xl font-bold mb-6 leading-relaxed uppercase">Our Mission</h1>
        <CardContent>
          <p className="text-[10px] leading-loose text-gray-600 uppercase">
            To destroy spam filters and deliver legitimate emails to the inbox. We believe in an open web where good senders aren't penalized by broken algorithms.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
