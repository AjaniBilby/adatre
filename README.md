# ADatRe

### Async Database Referencing
This package will allow you to asynchronously read and write from a javascript
database of which can be spanned across many different folders and drives,
as well as also allowing you to have template types of which each database item
can reference to allow default values to not be saved many times across the
database.

### Features;
* Create / Read / Write database items.
* Database templates.
* Database items referencing default values from template to save data.
* Storage over Shared drives with individual size allocation.
* Live javascript object database references
* JSDoc documentation for all functions

### Setup
```
var db = require('adatre');
```



___
# Operations

### new(type, id)
Create a new item of type  
Callback; err

### clone(type, id, callback)
Clone a specific item so their will be two copies kept in sync  
Callback; err

### get(type, id, callback)
Get an item's data  
Callback; err, data

### set(type, id, data)
Set/Update a item's data  
Callback; err

### save(type, id, data, callback)
Overwrite any existing data within the item with input  
Callback; err

### migrate(type, id, driveId, callback)
Move a specific instance of an item to a different drive  
Callback; err

### remove(type, id, driveId, callback)
Delete a specific instance of an item  
Callback; err

### delete(type, id, callback)
Delete all instances of an item  
Callback; err

### exists(type, id)
Does an item exist  
Returns boolean

### list(type)
List every item of type  
Returns list or null


___
# Settings

## Drive
```./data/drive.json``` is the location of the drive configuration file.  
Standard drive format:
```
{
	"[insert unique id]": {
		"location": "[insert location path]",
		"capacity": 1024
	}
}
```
Capacity is in bytes  




___
# Advanced Interface
These commands are only for advanced operations of which will almost never need to be used by a standard user.


## Template
Accessing the template object within adatre will allow you to get more data from your database.

### template.exist(type)
Returns a boolean whether a template exists or not.

### template.get(type, callback)
This will allows you to get the raw template object.  
Callback; error, data

### template.apply(type, data, callback)
Will apply the template to given data  
Callback data; error, data


## Drive
Accessing the drive object within adatre will allow you to get more live information about your database, but this will not be necacary for use.