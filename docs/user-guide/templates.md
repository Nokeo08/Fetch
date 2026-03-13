# Templates

Templates let you save and reuse common shopping list configurations, saving time on recurring shopping trips.

## Creating a Template

### From Scratch

1. Go to the Templates page
2. Create a new template with a name (1-100 characters)
3. Add items to the template, each with:
   - **Name** (required, 1-200 characters)
   - **Description** (optional)
   - **Quantity** (optional)
   - **Section name** (optional -- controls which section the item is placed in when applied)

### From an Existing List

1. Open a list
2. Choose "Save as Template"
3. Enter a template name
4. Optionally select which sections to include
5. All items and section assignments are preserved

## Managing Template Items

- Add, edit, and remove items from a template at any time
- Reorder items by dragging them
- Each item can be assigned a section name that determines placement when the template is applied

## Applying a Template to a List

1. Select a list to apply the template to
2. Choose which template items to include (or include all)
3. Fetch handles the rest:
   - Items with a **section name** are placed in a matching section (case-insensitive match)
   - If no matching section exists, a new one is created
   - Items without a section name go into a default "Items" section
   - **Duplicate items are skipped** -- if an item with the same name (case-insensitive) already exists in the target section, it is not added again

### Apply Results

After applying, you'll see a summary:
- **Added**: Number of items successfully added
- **Skipped**: Names of items that were skipped as duplicates

## Editing a Template

Update a template's name at any time. Add, remove, or reorder items as needed.

## Deleting a Template

Deleting a template removes the template and all of its items. Lists that were created from the template are not affected.
