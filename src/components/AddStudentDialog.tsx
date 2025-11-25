import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddStudentDialogProps {
  teacherId: string;
  onStudentAdded: () => void;
}

const AddStudentDialog = ({ teacherId, onStudentAdded }: AddStudentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const { toast } = useToast();

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Find student by email
      const { data: studentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_type')
        .eq('email', studentEmail.trim())
        .eq('user_type', 'student')
        .maybeSingle();

      if (profileError) throw profileError;

      if (!studentProfile) {
        toast({
          title: "Student not found",
          description: "No student found with this email address.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Check if already linked
      const { data: existingLink } = await supabase
        .from('teacher_students')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('student_id', studentProfile.id)
        .maybeSingle();

      if (existingLink) {
        toast({
          title: "Already linked",
          description: "This student is already in your class.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Link student to teacher
      const { error: linkError } = await supabase
        .from('teacher_students')
        .insert({
          teacher_id: teacherId,
          student_id: studentProfile.id
        });

      if (linkError) throw linkError;

      toast({
        title: "Success!",
        description: "Student added to your class."
      });

      setStudentEmail("");
      setOpen(false);
      onStudentAdded();
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add student.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Student to Class</DialogTitle>
          <DialogDescription>
            Enter the student's email address to add them to your class.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAddStudent} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student-email">Student Email</Label>
            <Input
              id="student-email"
              type="email"
              placeholder="student@example.com"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Student"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;
