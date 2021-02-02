
"""
Convert "FiveGenesOverTime.json" format gene expression data to "genes_by_time.json" format.
The script reads JSON data as standard input and produces the reorganized data as JSON text standard output.

On my machine I run it using the following commmand line:

% python make_genes_by_time_json.py < ~/misc/LisaBrown/FiveGenesOverTime.json > ~/tmp/test_output.json

"""
usage = __doc__

def main():
    import sys
    stdin = sys.stdin
    try:
        json_input = stdin.read()
    except:
        print (usage)
        return
    try:
        txt = converted_json(json_input)
    except:
        print (usage)
        raise
    else:
        print(txt)
    
def converted_json(json_input, as_string=True):
    import json
    data = json.loads(json_input)
    dicts = {}
    gene_names = data["Predicted_intensities_gene_names"]
    for (i, ti) in enumerate(data["Time_info"]):
        pi = data["Predicted_intensities"][i]
        #s_int = list(reversed(sorted(zip(pi, gene_names))))
        s_int = list(sorted(zip(pi, gene_names)))
        # lists, not tuples
        s_int = list(map(list, s_int))
        mi = max(*pi)
        ni = data["Nuclei_index"][i]
        coord = data["Coords"][i]
        ti = data["Time_info"][i]
        ti0 = str(ti[0])
        d = dict(time_info=ti, nucleus=ni, intensities=s_int, coord=coord, maxi=mi, ti0=ti0,
                #pi=pi
                )
        dicts[ni] = d
    time_to_dicts = {}
    for d in dicts.values():
        time_to_dicts[d["ti0"]] = []
    for d in dicts.values():
        time_to_dicts[d["ti0"]].append(d)
    times = sorted(dicts[0]["time_info"][0] for dicts in time_to_dicts.values())
    times = [str(t) for t in times]
    data_out = dict(time_to_dicts=time_to_dicts, gene_names=gene_names, times=times)
    if as_string:
        return json.dumps(data_out)
    else:
        return data_out

if __name__ == "__main__":
    main()