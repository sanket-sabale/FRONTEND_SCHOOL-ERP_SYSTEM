import { hasPermission } from "@/components/shared/permission-gate";
import { currentSessionRole } from "@/lib/current-user";

if (!hasPermission(currentSessionRole, "hr.view")) {
  redirect("/unauthorized");
}
