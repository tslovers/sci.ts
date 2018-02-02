/**
 * @author Hector J. Vasquez <ipi.vasquez@gmail.com>
 *
 * @licence
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This example represents an implementation of an Hybrid Genetic algorithm
 * to Airline Crew Scheduling. This implementation was proposed by David Levine:
 *
 * Levine, D. (1996). Application of a hybrid genetic algorithm to airline
 * crew scheduling. Computers & Operations Research, 23(6), 547-558.
 */

import * as path from 'path'
import * as fs from 'fs';
import * as _debug from 'debug';
import * as progress from 'cli-progress';

import {
  ImprovementStrategy as IS,
  RowSelectionStrategy as RSS,
  SPProblem
} from './SPProblem';
import {ssgarow} from './ssgarow';
import {BitSet} from 'std.ts';

declare const process: any;

const debug = _debug('main');
const DEFAULT_FILE = path.join(__dirname, '../assets/spp/custom.spp');
// Variables
const improvementStrategies = [IS.Best, IS.First];
const rowSelectionStrategies = [RSS.Max, RSS.Random];
const ITS = 20;

const filename: string = process.argv[2] || DEFAULT_FILE;
const problemName = filename.split('/').pop().split('.').shift();

fs.readFile(filename, 'utf-8', (err: Error, str: string) => {
  if (err) {
    throw err;
  }
  debug('Preparing data');
  // Processing data
  const data = processSpp(str);

  debug('Creating Set Partitioning Problem');
  // console.log(data);
  const problem = new SPProblem(data.rows, data.sets, data.costs, 5);
  const report: any[][] = [['Params', 'hMin', 'hMax', 'hAvg', 'tAvg', 'F?']];
  // const s = problem.generate();
  // console.log(problem.stringSol(s));
  let k;
  const bar: any = new progress.Bar({}, progress.Presets.shades_classic);
  bar.start(
    improvementStrategies.length * rowSelectionStrategies.length * ITS,
    k = 0
  );
  for (const is of improvementStrategies) {
    for (const rss of rowSelectionStrategies) {
      debug('New parameters -- ' +
        `Improve strategy: ${IS[is]}, Row Select. Strategy: ${RSS[rss]}`);
      let min = Infinity;
      let max = -Infinity;
      let avg = 0;
      let tAvg = 0;
      let feasible = false;
      let best = new BitSet(problem.n);
      for (let i = 0; i < ITS; i++) {
        const time = +new Date();
        const s = ssgarow(problem, 100, 100, 10, is, rss);
        const sCost = problem.value(s);
        tAvg += +new Date() - time;
        avg += sCost;
        min = min > sCost ? sCost : min;
        best = min > sCost ? s : best;
        max = max < sCost ? sCost : max;
        feasible = feasible || problem.validate(s);
        bar.update(++k);
      }
      debug(`Best solution found is ${problem.validate(best) ? '' : 'in'}`
        + `feasible: v = ${min} for '${SPProblem.stringSol(best)}'`);
      tAvg /= ITS;
      avg /= ITS;
      report.push([
        `is:${IS[is]}|rss:${RSS[rss]}`,
        min.toFixed(2),
        max.toFixed(2),
        avg.toFixed(2),
        tAvg.toFixed(2),
        feasible
      ]);
    }
  }

  bar.stop();

  let csvData = '';
  report.forEach(r => csvData += r.join(',') + '\n');
  const reportFile = problemName + '.SSGAROWReport.csv';
  fs.writeFile(reportFile, csvData, er => {
    if (er) {
      console.error('Something occurred while saving the report.');
    } else {
      console.log('Report saved at ' + reportFile);
    }
  });
});

/**
 * Process spp file format
 * @param str RAW spp file.
 * @returns The data processed.
 */
function processSpp(str: string) {
  const lines = str.split(/\r?\n/g);
  // Find rows [0] and cols [1]
  const mainInfo = lines.shift().match(/\d+/g).map(Number);
  const costs: number[] = [];
  // n columns or sets
  const sets: number[][] = [];
  // Each of this lines represents one column/set
  lines.forEach(line => {
    if (/\d+(\.\d+)?/.test(line)) {
      // Gets all number from the line
      const values = line.match(/\d+(\.\d+)?/g).map(i => Number(i) - 1);
      // The first element of each line represents the cost of this column
      costs.push(values.shift() + 1);
      const nValues = values.shift() + 1;
      if (values.length !== nValues) {
        throw new Error('Wrong input, number of columns on set differ from' +
          ' specified');
      }
      sets.push(values);
    }
  });

  if (mainInfo[1] !== sets.length) {
    throw new Error('The actual number of sets/columns is not the specified');
  }

  return {
    rows: mainInfo[0],
    costs: costs,
    sets: sets
  }
}
