import { Button } from "@/components/ui/button";

export function ButtonTypeExamples() {
  return (
    <>
      <Button>Save</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="outline" size="sm">View</Button>
      <Button variant="ghost" selected>Navigation item</Button>
      <Button variant="destructive" loading>Deleting...</Button>
      <Button variant="link">Open details</Button>
      <Button size="lg" type="submit" name="intent" value="create">Create New Student Admission</Button>
      <Button size="icon" aria-label="Search">
        <span aria-hidden="true">+</span>
      </Button>
      <Button size="icon" aria-labelledby="search-label">
        <span aria-hidden="true">+</span>
      </Button>
    </>
  );
}

function InvalidIconButtonExample() {
  return (
    <>
      {/* @ts-expect-error Icon-only buttons require aria-label or aria-labelledby. */}
      <Button size="icon">
        <span aria-hidden="true">+</span>
      </Button>
    </>
  );
}

void InvalidIconButtonExample;
