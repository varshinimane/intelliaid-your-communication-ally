import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2 } from "lucide-react";

interface SendInstructionDialogProps {
  studentId: string;
  studentName: string;
}

const SendInstructionDialog = ({ studentId, studentName }: SendInstructionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const [subject, setSubject] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendInstruction = async () => {
    if (!title.trim() || !instruction.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and instruction.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get AI-simplified version of the instruction
      const { data: simplifiedData, error: simplifyError } = await supabase.functions.invoke(
        'process-communication',
        {
          body: { text: instruction, action: 'simplify' }
        }
      );

      if (simplifyError) throw simplifyError;

      const simplifiedInstruction = simplifiedData?.result || instruction;

      // Save instruction to database
      const { error: insertError } = await supabase
        .from('teacher_instructions')
        .insert({
          teacher_id: user.id,
          student_id: studentId,
          title: title.trim(),
          original_instruction: instruction.trim(),
          simplified_instruction: simplifiedInstruction,
          subject: subject.trim() || null,
        });

      if (insertError) throw insertError;

      toast({
        title: "Instruction Sent",
        description: `Successfully sent instruction to ${studentName}`,
      });

      // Reset form
      setTitle("");
      setInstruction("");
      setSubject("");
      setOpen(false);
    } catch (error: any) {
      console.error('Error sending instruction:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send instruction",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Send className="h-4 w-4 mr-2" />
          Send Instruction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Send Instruction to {studentName}</DialogTitle>
          <DialogDescription>
            Create an assignment or instruction. It will be automatically simplified for the student.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Writing Assignment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject (Optional)</Label>
            <Input
              id="subject"
              placeholder="e.g., Environmental Science"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instruction">Instruction *</Label>
            <Textarea
              id="instruction"
              placeholder="e.g., Write a paragraph explaining environmental sustainability and how we can protect our planet for future generations..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="min-h-[150px]"
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              ℹ️ This will be automatically simplified using AI before the student sees it.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSendInstruction} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Instruction
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendInstructionDialog;
