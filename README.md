# ADataRe

### Async Database Referencing
This package will allow you to asynchronously read and write from a javascript
database of which can be spanned across many different folders and drives,
as well as also allowing you to have template types of which each database item
can reference to allow default values to not be saved many times across the
database.

#### Features
* Create / Read / Write database items.
* Database templates.
* Database items referencing default values from template to save data.
* Storage over Shared drives with individual size allocation.
* Live javascript object database references



___


# Setup
```
var db = require('adatre');
```