case "initgrid":
// Load data
var rows = self.MOD.get("rows");
var page = self.MOD.get("page");
var startRow = self.MOD.get("startrow");
var filters = self.MOD.get("filters");

var #FNAME#Query = {};
var #FNAME#s = [];

#FNAME#Query = #FNAME#.find({ where: Filters.convertToCriteria(filters, "#FNAME#") })
	.sort(self.MOD.get("sortby") + " " + self.MOD.get("sortorder").toUpperCase())
	.skip(startRow - 1)
	.limit(rows);
#FNAME#Query.exec(function (err, rawData) {

	if (err) {
		cb(err);
	}

	else {
		_.forEach(rawData, function (record, i) {

			var local = {};

			#IGBLOCK#

		#FNAME#s.push(local);
	});

// Send our array of role objects.
self.MOD.set("data",#FNAME#s);
// Run the callback
cb();
}
});


break;