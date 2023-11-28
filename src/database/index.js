const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://LpResende:<HkEwx7Wo3uBCKHoc>@cluster0.zhv2qwo.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.Promise = global.Promise;

export default mongoose; 