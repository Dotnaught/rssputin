const schema = {
	type: "object",
	required: [],
	properties: {
		feeds: {
			type: "array",
			items: {
				type: "object",
				required: [],
				properties: {
					feed: {
						type: "string",
					},
					visible: {
						type: "boolean",
					},
					color: {
						type: "string",
					},
					domain: {
						type: "string",
					},
					filterList: {
						type: "string",
					},
					mode: {
						type: "string",
					},
					pageHash: {
						type: "string",
					},
					linkHash: {
						type: "string",
					},
					timeLastChecked: {
						type: "number",
					},
					id: {
						type: "number",
					},
					action: {
						type: "boolean",
					},
				},
			},
		},
	},
};

const testData = {
	feeds: [
		{
			feed: "Enter valid feed",
			visible: true,
			domain: "",
			filterList: "",
			mode: "",
			pageHash: "",
			linkHash: "",
			timeLastChecked: 1610835268939,
			id: 0,
		},
		{
			feed: "https://www.theregister.com/headlines.atom",
			visible: false,
			filterList: "",
			id: 4,
			mode: "",
			pageHash: "",
			linkHash: "",
			timeLastChecked: 1610991031916,
			domain: "https://www.theregister.com",
		},
	],
};

module.exports = { schema, testData };
