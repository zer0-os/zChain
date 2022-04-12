import blessed from 'blessed';
import contrib from 'blessed-contrib';
import fs from "fs";


export class ZScreen {

	constructor(){
		this.screen = blessed.screen({smartCSR: true});
	        this.screen.title = "Zchain"
		this.screen.key(['escape', 'q', 'C-c'], function(ch, key) {return process.exit(0);});
		this.grid = new contrib.grid({rows: 12, cols: 12, screen: this.screen});
		this.choices = ["Profile","Connections","Settings","Topics feed"]
		this.meowAsci = fs.readFileSync("meowAsci.txt")
		this.initStaticScreen()
	}
	initStaticScreen(){
		this.mapBox = this.grid.set(6,0,6,6,contrib.map,{label:"Nodes map"});
		this.connectionsLogBox = this.grid.set(9,6,3,6,contrib.log,{fg:"green",selectedFg:"green",label:"Discovery and connections"});
		this.subscribedTopicsLog = this.grid.set(6,6,3,6,blessed.log,{fg:"green",selectedFg:"green",label:"Subscribed topics feed"});
		this.choiceListBox = this.grid.set(0,0,6,2,blessed.list,{
			interactive:true,
			mouse: true,
			items:this.choices,
			selectedFg :"blue",
			selectedBg :"green",
			fg:"white",
			label:"Select a function"
		});
		this.logoBox = this.grid.set(0,8,6,4,blessed.text,{
			align:"left",
			fg : "green",
			content : this.meowAsci.toString()
		});

	}

}
