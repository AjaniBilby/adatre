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
* Asynchronous and synchronous versions of most functions


##### Notes
* ***Asynchronous***: means that if you call the function your code will continue with the next tasks and then return though the callback functions once the task is complete.
* ***Synchronous***: means that the next task in code will not run until this task finishes.



___


# Setup
In your NodeJS server
```
var db = require('adatre');
```
## Config
After first time setup there should be a database folder in your apps root
directory, within there will be the config.json.
This will allow you to add new drives for the database to store within, as well
as whether or not the .json files are stored in a human easy to read file
(with tabbing, and newlines) or a basic json file (this option will save data)

### Drives
Each drive should be written in this format
Size is in bytes
```
{
  "drives": {
    "temp": {
      "location": "./temp/",
      "size": 10000
    }
  }
}

```

### cleanLayout
If false it will save the .json data with no new lines or tabbing (harder to read by human).
Other wise it will save it with new lines and tabbing (cleaner reading for human, also larger file size).

### ignoreMain
If true the database will from then on not use the main drive to store data.

### autoMigrate
If true it will mean that if a file becomes too large it will automatically more it to a new drive.

### removeOldFiles
If false it will mean that if there are duplicate items saved across the database it will delete the oldest one.

___



# Data manipulation

## new(type, id, callback)
This will create a new database item of which will reference the template (type).
If the template is invalid the database item will not break, instead it will just
not reference anything.

**db.new** is important because you cannot create a new data item though db.open,
db.set, or, db.save.
## newSync(type, id)
Same as db.new but there is no callback and it is a synchronous function of which
will return true / false, for success or fail.  

## exists(type, id, callback)
Will return true or false whether or not the item exists.
This function can be used synchronously as it will return true / false, or it can
be used asynchronously if you use the call back (although this will still behave
synchronously and will return true or false).

## get(type, id, callback)
Will send the of the database item in object for to the callback function.
If the item is invalid it will send null to the callback.
## getSync(type, id)
Same as db.get but there is no callback and it is a synchronous function of which
will return the data or null, for success or fail.

## getTemplate(type, id, callback)
Will send the template data in object for to the callback function.
If the item is invalid it will send null to the callback.
## getTemplateSync(type, id)
Same as db.getTemplate but there is no callback and it is a synchronous function of which
will return the data or null, for success or fail.

## set(type, id, newData, callback)
This will merge the newData with any current data in the database item so that the
new data will overwrite old.
The callback will be called when the task is finished, the callback will receive
two parameters success, and data.
**Example:** db.set('user', 2, {somevalue: 42}, function(success, data){});
## setSync(type, id, newData)
Same as db.set but there is no callback and it is a synchronous function of which
will return the true or false, for success or fail.

## save(type, id, data, callback)
This will overwrite any and all data in that database item so that the input data
will be the only data for that item.
The callback will have the data success and data. (Look at db.set for example).
## saveSync(type, id, data)
Same as db.save but there is no callback and it is a synchronous function of which
will return the true or false, for success or fail.

## remove(type, id, callback)
This will delete the database item.
## removeSync(type, id)
This will delete the database item.

## open(type, id, callback)
This is one of the more complex functions of which will allow you to open a
database item and edit it then on return it will save the new data.
Although if the item is not close no other call to set / save to this item will
parse though and instead will queue up.
**Example Of Use**
```
db.open('user', 2, function(data, close){
  data.someValue = "new value";

  //When return called the database will then save the data
  return
});
```

## migrate(type, id, driveTo, callback)
This function will move any database item from it's current drive to a different
one.
**driveTo** can be inputted as an id string or as a drive reference.
The callback will have the data for success or not
## migrateSync(type, id, driveTo)
Same as db.migrate but there is no callback and it is a synchronous function of which
will return the true or false, for success or fail.

## list(type)
If type is left undefined it will return an array of types of data item.  
If the type is a string it will return an array of all items of that type.  
If type = 'any' then it will return all items ids of all types.  
If type = 'anytype' then it will return all items ids of all types in the syntax type\\id.  



___



# Buffers
These functions will allow you to save buffers straight into the database, so that things such as files can be stored in the database.

## BufferToObject(buffer)
This will return an object interpretation of the buffer.

## BufferFromObject(object)
If inputted a object created from db.BufferToObject it will return a buffer exactly the same as the original buffer inputted to db.BufferToObject



___




# Profiles
There is a built in component to create user profiles, this built in component will have profile create and login pre-made as well as password encryption.

## newProfile(username, password, callback)
This will create a new profile database item with the username as the id, and then also encrypt the password. It will parse though the callback true or false for success or fail.
## newSyncProfile(username, password, callback)
This function is the same as newProfile but it is synchronous and will return true or false for success or fail.
## loginProfile(username, password, callback)
This function will allow you to parse in a username and the attempted password and the callback will parse true or false for success or fail.
## loginSyncProfile(username, password, callback)
This function is the same as loginProfile but it is synchronous and will return true or false for success.




___




# Live Data References
## Creation
```
var ref = db.createDataRef('user', 2);
```
## Edition Values
```
ref.data = {someValue: 'new'};
```
## Settings
**ref.autosave:** this will change whether or not after every time you change a value on the ref it will save this straight to the database item before continuing.  
**ref.absolute:** this will meant that every time you try and get a value from the reference it will reload the data synchronously from the database item, other wise it will just return the cached values

## Things to remember
The way that this reference works you will not be able to use it exactly as a normal javascript object.
```ref.data.someValue = 'new'```  
Will break the reference as the data listener will only work when you directly change ref.data, so instead you should do this.
```ref.data {someValue: 'new'}```
If you do change the ref.data incorrectly you can still use ref.save() to save the data.  
Keep in mind that it will merge it's current data and your new data properly as seen below.
```
ref.data = {
  "value1": true
  "value2": false,
  "value3": {
    "value4": 42
  }
}

ref.data = {"value3": {"value4": 'newValue'}};

console.log(ref.data);
//Result
//{
//  "value1": true
//  "value2": false,
//  "value3": {
//    "value4": 'newValue'
//  }
//}

```


___


# Backend Functions
These are functions in the library but will likely not be used by most people
these are just listed to help with anyone's understanding of the library.

## indexDrives()
Not necessary unless you are manually putting files into the database and want
to index them, other wise the database automatically indexes on startup and
updates it's index live.

## getDriveSize()
This will allow you to get the amount of bytes taken up in the database for a
specific drive.
This will also update the index for that drive.

## listDrives()
Will return an array of all drive ids

## addDrive(id, size, location)
Will add a new drive to the database's config and will be operational instantly.

## getDriveUssage()
returns; bytes used, bytes available for use, total drive size, number of unrestricted drives (drives with no max space defined)

## pickDrive(dataSizeInBytes)
Not necessary, this function will return a drive of which to fit a file of the
size specified (default 0).

## GetObjectSize(object)
This will return the amount of bytes of which that object will use if saved as a JSON with !cleanLayout.
